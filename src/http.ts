import { createServer, IncomingHttpHeaders, OutgoingHttpHeaders, ServerResponse } from 'node:http'
import { v4 as uuid } from 'uuid'
import { Event } from './core'
import { Readable } from 'node:stream'
import { link, mkdir, appendFile, stat } from 'node:fs/promises'
import { createWriteStream, mkdirSync, createReadStream } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'

const dataDir = 'data'
const eventDir = join(dataDir, 'events')
const eventIndex = join(eventDir, 'index.jsonl')
mkdirSync(eventDir, { recursive: true })

export const server = createServer()

export interface ResponseEvent extends Event {
  type: 'response'
  request: string
  status: number
  statusText?: string
  headers?: OutgoingHttpHeaders
  content?: Readable | unknown
}

export interface RequestEvent extends Event {
  type: 'request' | 'responded'
  request: string
  http?: string
  method?: string
  url?: string
  headers?: IncomingHttpHeaders
  content?: Readable
  connection?: string
  path?: string
}

server.on('event', (ev) => appendFile(eventIndex, JSON.stringify(ev) + '\n'))

server.on('request', async (req, res) => {
  try {
    const { socket, headers, method, url, httpVersion } = req
    const id = uuid()
    const client = { address: socket.remoteAddress, family: socket.remoteFamily, port: socket.remotePort }
    const request = { client, http: httpVersion, method, url, ...headers }
    server.emit('event', { id: uuid(), type: 'request', request: id, ...request })

    if (url) {
      const { pathname } = new URL(url, `http://${req.headers.host}`)
      const file = join(dataDir, pathname)

      // PUT
      const length = headers['content-length']
      if (method === 'PUT' && length && parseInt(length) > 0) {
        const content = join(eventDir, id)
        await new Promise((r) => {
          const w = createWriteStream(content)
          w.on('finish', r)
          req.pipe(w)
        })
        await mkdir(file, { recursive: true })
        await link(content, file)
        return res.writeHead(200).end()
      }

      // GET
      if (method === 'GET') {
        const meta = await new Promise<Record<string, unknown>>((resolve, reject) => {
          const rl = createInterface(createReadStream(eventIndex))
          rl.on('line', (line) => resolve())
        })
        const stats = await stat(file)
      }

      // DELETE
      // PATCH
      // POST

      // SSE
      if (method === 'GET' && headers.accept === 'text/event-stream') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' })
        const { statusCode: status, statusMessage: message } = res
        const headers = res.getHeaders()
        server.emit('event', { id: uuid(), type: 'chunked', request: id, status, message, ...headers })
        server.on('event', (ev: { type?: string; id?: string }) => {
          if (ev.type) res.write(`event: ${ev.type}\n`)
          if (ev.id) res.write(`id: ${ev.id}\n`)
          res.write(`data: ${JSON.stringify(ev)}\n\n`)
        })
      }
    }

    res.on('close', () => {
      const { statusCode: status, statusMessage: message } = res
      const headers = res.getHeaders()
      server.emit('event', { id: uuid(), type: 'response', request: id, status, message, ...headers })
    })
    res.writeHead(501).end()
  } catch (err) {
    console.error(err)
    res.writeHead(500).end()
  }
})

server.listen(8520, () => {
  console.log('HTTP Server listen.', server.address())
})
