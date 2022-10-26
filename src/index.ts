import { Server, IncomingMessage } from 'node:http'
import { v4 as uuid } from 'uuid'
import { mkdirSync, createReadStream } from 'node:fs'
import { mkdir, appendFile, writeFile } from 'node:fs/promises'
import { join, parse } from 'node:path'
import { createInterface } from 'node:readline'

export class Core extends Server {
  dataDir = 'data'

  constructor() {
    super()
    mkdirSync(this.dataDir, { recursive: true })

    // dispatch request event
    this.on('request', (req: IncomingMessage & { id?: string; toJSON?: () => any }, res) => {
      const id = uuid()
      req.id = id
      req.toJSON = () => {
        const { socket, headers, method, url, httpVersion } = req
        const client = { address: socket.remoteAddress, family: socket.remoteFamily, port: socket.remotePort }
        const request = { client, http: httpVersion, method, url, ...headers }
        return { ...request, id, type: 'request' }
      }
      this.emit('event', req)
    })

    // timeout
    this.on('request', (req: IncomingMessage & { id: string }, res) => {
      const { id } = req
      const timeout = setTimeout(() => res.writeHead(501).end(), 3000)
      const onfinish = () => clear()
      const onevent = (ev: { request?: string }) => ev.request === id && clear()
      const clear = () => {
        clearTimeout(timeout)
        res.off('finish', onfinish)
        this.off('event', onevent)
      }
      res.on('finish', onfinish)
      this.on('event', onevent)
    })

    // SSE
    this.on('request', (req: IncomingMessage & { id: string }, res) => {
      const { method, headers, id } = req
      if (headers.accept !== 'text/event-stream') return
      if (method !== 'GET') return
      res.setHeader('Content-Type', 'text/event-stream')
      res.statusCode = 200
      this.on('event', (ev) => res.write(`data: ${JSON.stringify(ev)}\n\n`))
      this.emit('event', {
        ...res.getHeaders(),
        type: 'chunked',
        request: id,
        status: res.statusCode,
        message: res.statusMessage,
      })
    })

    // POST
    this.on('request', async (req: IncomingMessage & { id: string }, res) => {
      const { method, url, headers } = req
      if (method !== 'POST') return
      if (!url) return
      // create new item
      const id = uuid()
      const { pathname } = new URL(url, `http://${headers.host}`)
      const dir = join(this.dataDir, pathname)
      await mkdir(dir, { recursive: true })
      // store content
      const file = join(dir, id)
      await writeFile(file, req)
      // store index
      const index = join(dir, 'index.jsonl')
      await appendFile(index, JSON.stringify({ ...headers, id, request: req.id }) + '\n')

      res.statusCode = 201
      res.end(id)
      this.emit('event', {
        ...res.getHeaders(),
        type: 'responded',
        request: req.id,
        status: res.statusCode,
        message: res.statusMessage,
      })
    })

    // GET
    this.on('request', async (req: IncomingMessage & { id: string }, res) => {
      const { method, headers, url, id } = req
      if (headers.accept === 'text/event-stream') return
      if (method !== 'GET') return
      if (!url) return

      try {
        const { pathname } = new URL(url, `http://${headers.host}`)
        const file = join(this.dataDir, pathname)
        const meta = await new Promise<{ 'content-type'?: string; 'content-length'?: string }>((resolve, reject) => {
          const { dir, name } = parse(pathname)
          const index = join(this.dataDir, dir, 'index.jsonl')
          const rl = createInterface(createReadStream(index))
          rl.on('line', (line) => {
            const index = JSON.parse(line)
            if (index.id === name) resolve(index)
          })
          rl.on('close', reject)
          rl.on('error', reject)
        })
        if (meta['content-type']) res.setHeader('Content-Type', meta['content-type'])
        if (meta['content-length']) res.setHeader('Content-Length', meta['content-length'])
        res.statusCode = 200
        createReadStream(file).pipe(res)
        this.emit('event', {
          ...res.getHeaders(),
          type: 'responded',
          request: id,
          status: res.statusCode,
          message: res.statusMessage,
        })
      } catch (err) {
        console.warn(err, JSON.stringify(req, null, 2))
      }
    })
  }
}
