import { createSecureServer, Http2ServerResponse } from 'node:http2'
import { readFileSync } from 'node:fs'
import { getItem } from './Item'
import { Session } from './Session'
import { Http2Decoder } from './Http2Decoder'

const config = getItem('config', {
  key: readFileSync('./localhost.key', 'utf-8'),
  cert: readFileSync('./localhost.crt', 'utf-8'),
  port: 443,
  listen: true,
})

const slaves = new Set<Http2ServerResponse>()
const sessions = new Map<string, Session>()

const server = createSecureServer({ allowHTTP1: true }, async (req, res) => {
  if (req.url.startsWith('/sessions')) {
    if (req.method === 'GET' && req.headers.accept === 'application/json') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      return res.end(JSON.stringify([...sessions]))
    }
    const session = sessions.get(req.url)
    if (!session) return res.writeHead(404).end()
    if (req.method === 'POST' && req.headers['content-type'] === 'application/http') {
      try {
        const response = req.pipe(new Http2Decoder()).response()
        session.respondWith(response)
        const { headers } = await response
        slaves.forEach(v => v.write(`event: response\ndata: ${JSON.stringify(headers)}\n\n`))
        return res.end()
      } catch {
        return res.writeHead(500).end()
      }
    }
    if (req.method === 'GET' && req.headers.accept === 'application/http') {
      res.writeHead(200, { 'content-type': 'application/http', 'cache-control': 'no-store' })
      return session.stream().pipe(res)
    }
    return res.writeHead(501).end()
  }

  // connect slave
  if (req.method === 'GET' && req.headers.accept === 'text/event-stream') {
    res.once('close', () => slaves.delete(res))
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' })
    res.write('retry: 1000\n\n')
    slaves.add(res)
    return
  }

  // management
  if (req.url.startsWith('/slaves')) {
    if (req.method === 'GET' && req.headers.accept === 'application/json') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      return res.end(JSON.stringify([...slaves]))
    }
  }

  // register request
  const id = '/sessions/' + crypto.randomUUID()
  // const session = await Session.from(req, res)
  const session = new Session(req, res)
  res.once('close', () => setTimeout(() => sessions.delete(id), 5000))
  sessions.set(id, session)
  slaves.forEach(v => v.write(`data: ${id}\n\n`))
  slaves.forEach(v => v.write(`event: request\ndata: ${JSON.stringify(req.headers)}\n\n`))
})

server.on('error', (...args) => console.log('error', ...args))
server.on('stream', (stream, headers) => {
  console.log('stream open', stream.id, headers)
  stream.on('close', () => console.log('stream close', stream.id, stream.sentHeaders))
})
server.on('close', () => console.log('closed.'))
server.on('listening', () => console.log('listening', server.address()))

config.addEventListener('change', () => {
  console.log('config change.', config)
  const { key, cert, port, listen } = config
  if (server.listening) server.close()
  server.setSecureContext({ key, cert })
  if (listen) server.listen(port)
})
config.dispatchEvent(new Event('change'))
