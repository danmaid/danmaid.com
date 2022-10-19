import { createServer, IncomingMessage, OutgoingHttpHeaders } from 'http'
import { v4 as uuid } from 'uuid'
import { Socket } from 'node:net'
import { EventEmitter } from 'node:events'
import { core } from './core'

const requests = new EventEmitter()

core.on('response', (m, v, content) => {
  requests.emit(m.request, m, v, content)
})

export const server = createServer()

type SocketWithID = Socket & { id?: string }
server.on('connection', (socket: SocketWithID) => {
  const connection = {
    id: uuid(),
    remote: {
      address: socket.remoteAddress,
      family: socket.remoteFamily,
      port: socket.remotePort,
    },
  }
  socket.id = connection.id
  socket.once('close', () => core.emit('connection', { type: 'closed' }, connection.id))
  core.emit('connection', { type: 'opened' }, connection)
})

export interface ResponseEvent extends Record<string, unknown> {
  status: number
  statusText?: string
  headers?: OutgoingHttpHeaders
}

type IncomingMessageWithID = IncomingMessage & { id?: string; socket: SocketWithID }
server.on('request', (req: IncomingMessageWithID, res) => {
  const request = {
    id: uuid(),
    http: req.httpVersion,
    method: req.method,
    url: req.url,
    headers: req.headers,
  }
  req.id = request.id
  const connection = req.socket.id

  req.once('close', () => core.emit('request', { type: 'closed' }, request.id))
  requests.on(request.id, (m: any, ev: ResponseEvent, body?: unknown) => {
    res.on('finish', () => core.emit('request', { type: 'sent', request }, request.id))
    res.writeHead(ev.status, ev.statusText, ev.headers)
    if (body) res.write(body)
    res.end()
  })

  core.emit('request', { type: 'opened', connection }, request, req)
})

server.listen(8520, () => {
  console.log('HTTP Server listen.', server.address())
})
