import { createServer, IncomingHttpHeaders } from 'node:http'
import { v4 as uuid } from 'uuid'
import { link, mkdir, appendFile, rm, rename } from 'node:fs/promises'
import { createWriteStream, mkdirSync, createReadStream } from 'node:fs'
import { join, dirname, parse } from 'node:path'
import { createInterface } from 'node:readline'

const dataDir = 'data'
const eventPath = '/events'
const eventDir = join(dataDir, eventPath)
const eventIndex = join(eventDir, 'index.jsonl')
mkdirSync(eventDir, { recursive: true })

export const server = createServer()

server.on('event', (ev) => appendFile(eventIndex, JSON.stringify(ev) + '\n'))

server.on('request', async (req, res) => {
  try {
    const { socket, headers, method, url, httpVersion } = req
    const id = uuid()
    const client = { address: socket.remoteAddress, family: socket.remoteFamily, port: socket.remotePort }
    const request = { client, http: httpVersion, method, url, ...headers }
    const event = { id: uuid(), date: new Date(), type: 'request', request: id, ...request }
    server.emit('event', event)
    res.on('close', () => {
      const { statusCode: status, statusMessage: message } = res
      const headers = res.getHeaders()
      server.emit('event', { id: uuid(), date: new Date(), type: 'response', request: id, status, message, ...headers })
    })

    if (url) {
      const { pathname } = new URL(url, `http://${req.headers.host}`)
      const file = join(dataDir, pathname)

      // PUT
      const length = headers['content-length']
      if (method === 'PUT' && length && parseInt(length) > 0) {
        const content = join(dataDir, `${eventPath}/${id}`)
        await new Promise((r) => {
          const writer = createWriteStream(content)
          writer.on('finish', r)
          req.pipe(writer)
        })
        await mkdir(dirname(file), { recursive: true })
        await rm(file, { force: true })
        await link(content, file)
        const { name, dir } = parse(file)
        const indexFile = join(dir, 'index.jsonl')
        const newFile = await new Promise<string>((resolve, reject) => {
          const rl = createInterface(createReadStream(indexFile))
          const newFile = `${file}.${new Date().getTime()}`
          const w = createWriteStream(newFile)
          rl.on('error', () => resolve(newFile))
          rl.on('line', (line) => JSON.parse(line).id !== name && w.write(line + '\n'))
          rl.on('close', () => resolve(newFile))
        })
        await appendFile(newFile, JSON.stringify({ ...event, id: name }) + '\n')
        await rm(indexFile, { force: true })
        await rename(newFile, indexFile)
        return res.writeHead(200).end()
      }

      // SSE
      if (method === 'GET' && headers.accept === 'text/event-stream') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' })
        const { statusCode: status, statusMessage: message } = res
        const headers = res.getHeaders()
        server.on('event', (ev) => res.write(`data: ${JSON.stringify(ev)}\n\n`))
        server.emit('event', {
          id: uuid(),
          date: new Date(),
          type: 'chunked',
          request: id,
          status,
          message,
          ...headers,
        })
        return
      }

      // GET
      if (method === 'GET') {
        try {
          const index = await new Promise<IncomingHttpHeaders>((resolve, reject) => {
            const [_, parent, name] = /(.*)\/([^/]*)$/.exec(pathname) || []
            const file = join(dataDir, parent, 'index.jsonl')
            const rl = createInterface(createReadStream(file))
            rl.on('error', reject)
            rl.on('line', (line) => {
              const index = JSON.parse(line)
              if (index.id === name) resolve(index)
            })
            rl.on('close', reject)
          })
          const reader = createReadStream(join(dataDir, pathname))
          reader.on('error', console.error)
          res.writeHead(200, {
            'Content-Length': index['content-length'],
            'Content-Type': index['content-type'],
          })
          return reader.pipe(res)
        } catch {
          return res.writeHead(404).end()
        }
      }

      // DELETE
      // PATCH
      // POST
    }

    res.writeHead(501).end()
  } catch (err) {
    console.error(err)
    res.writeHead(500).end()
  }
})

server.listen(8520, () => {
  console.log('HTTP Server listen.', server.address())
})
