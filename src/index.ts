import { Server, IncomingMessage } from 'http'
import { v4 as uuid } from 'uuid'

export const server = new Server()

// dispatch request event
server.on('request', (req: IncomingMessage & { id?: string; toJSON?: () => any }, res) => {
  const id = uuid()
  req.id = id
  req.toJSON = () => {
    const { socket, headers, method, url, httpVersion } = req
    const client = { address: socket.remoteAddress, family: socket.remoteFamily, port: socket.remotePort }
    const request = { client, http: httpVersion, method, url, ...headers }
    return { ...request, id, type: 'request' }
  }
  server.emit('event', req)
})

// SSE
server.on('request', (req, res) => {
  const { method, headers } = req
  if (headers.accept !== 'text/event-stream') return
  if (method !== 'GET') return
  res.writeHead(200, { 'Content-Type': 'text/event-stream' })
  res.flushHeaders()
  server.on('event', (ev) => res.write(`data: ${JSON.stringify(ev)}\n\n`))
})

// 501
server.on('request', (req, res) => {
  setTimeout(() => {
    if (!res.headersSent) res.writeHead(501).end()
  }, 3000)
})

server.listen(8520)
