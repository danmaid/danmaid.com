import { events } from './events'
import { createServer, IncomingMessage, OutgoingHttpHeaders } from 'http'
import { v4 as uuid } from 'uuid'
import { Socket } from 'node:net'
import { EventEmitter } from 'node:events'

const rr = new EventEmitter()

events.on('event', (ev) => {
  if (ev.type !== 'response') return
  rr.emit(ev.id, ev)
})

export const server = createServer()

type SocketWithID = Socket & { id?: string }
server.on('connection', (socket: SocketWithID) => {
  const event = {
    type: 'connection',
    id: uuid(),
    remote: {
      address: socket.remoteAddress,
      family: socket.remoteFamily,
      port: socket.remotePort,
    },
  }
  socket.id = event.id
  events.add(event)
})

type IncomingMessageWithID = IncomingMessage & { id?: string; socket: SocketWithID }
export interface ResponseEvent extends Record<string, unknown> {
  type: 'response'
  id: string
  status: number
  statusText?: string
  headers?: OutgoingHttpHeaders
}
server.on('request', (req: IncomingMessageWithID, res) => {
  const event = {
    type: 'request',
    id: uuid(),
    http: req.httpVersion,
    method: req.method,
    url: req.url,
    headers: req.headers,
    connection: req.socket.id,
  }
  req.id = event.id
  rr.once(event.id, (ev: ResponseEvent, body?: unknown) => {
    res.writeHead(ev.status, ev.statusText, ev.headers)
    if (body) res.write(body)
    res.end()
  })
  req.headers['content-length'] ? events.add(event, req) : events.add(event)
})

server.listen(8520, () => {
  console.log('HTTP Server listen.', server.address())
})
