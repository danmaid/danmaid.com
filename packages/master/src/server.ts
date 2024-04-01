import { createSecureServer, Http2ServerResponse, IncomingHttpHeaders } from 'node:http2'
import { readFileSync } from 'node:fs'
import { Readable } from 'node:stream'
import { getItem } from './Item'
import { HttpDecoder } from './HttpDecoder'

const config = getItem('config', {
  key: readFileSync('./localhost.key', 'utf-8'),
  cert: readFileSync('./localhost.crt', 'utf-8'),
  port: 443,
  listen: true,
})

const slaves = new Set<Http2ServerResponse>()
interface Session {
  method: string
  url: string
  headers: IncomingHttpHeaders
  body: Buffer
  response: Http2ServerResponse
}
const sessions = new Map<string, Session>()

const server = createSecureServer({ allowHTTP1: true }, async (req, res) => {
  // response
  if (req.method === 'POST' && req.headers['content-type'] === 'application/http') {
    const session = sessions.get(req.url)
    if (!session) return res.writeHead(404).end()
    sessions.delete(req.url)
    const { response } = session
    const http = req.pipe(new HttpDecoder())
    http.once('response', (status, headers) => {
      headers.forEach((v, k) => response.setHeader(k, v))
      response.writeHead(status)
    })
    return http.pipe(response)
  }

  // get pending request
  if (req.method === 'GET' && req.headers.accept === 'application/http') {
    const session = sessions.get(req.url)
    if (!session) return res.writeHead(404).end()
    res.writeHead(200, { 'content-type': 'application/http' })
    const { method, url, headers, body } = session
    await new Promise(r => res.write(`${method} ${url} HTTP/1.1\r\n`, r))
    for (const [k, v] of Object.entries(headers)) {
      if (k.startsWith(':')) continue
      await new Promise(r => res.write(`${k}: ${v}\r\n`, r))
    }
    await new Promise(r => res.write('\r\n', r))
    return Readable.from(body).pipe(res)
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
  if (req.url.startsWith('/sessions')) {
    if (req.method === 'GET' && req.headers.accept === 'application/json') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      return res.end(JSON.stringify([...sessions]))
    }
  }

  // register request
  const id = req.url + crypto.randomUUID()
  const { method, url, headers } = req
  const body = await new Promise<Buffer>((resolve) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
  })
  sessions.set(id, { method, url, headers, body, response: res })
  slaves.forEach(v => v.write(`data: ${id}\n\n`))
  res.setTimeout(5000, () => sessions.delete(id) && res.writeHead(501).end())
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
