import { createServer, IncomingMessage, IncomingHttpHeaders, OutgoingHttpHeaders } from 'http'
import { v4 as uuid } from 'uuid'
import { Socket, AddressInfo } from 'node:net'
import { core, Event } from './core'
import { Readable } from 'node:stream'

export const server = createServer()

type ConnectionId = string
interface ConnectionDetail {
  id: ConnectionId
  remote: Partial<AddressInfo>
}
export interface ConnectionEvent extends Event {
  type: 'connected' | 'disconnected'
  connection: ConnectionDetail | ConnectionId
}

type SocketWithID = Socket & { id?: string }
server.on('connection', (socket: SocketWithID) => {
  const id: ConnectionId = uuid()
  const connection: ConnectionDetail = {
    id,
    remote: {
      address: socket.remoteAddress,
      family: socket.remoteFamily,
      port: socket.remotePort,
    },
  }
  socket.id = id
  socket.once('close', () => core.emit<ConnectionEvent>({ type: 'disconnected', connection: id }))
  core.emit<ConnectionEvent>({ type: 'connected', connection })
})

export interface ResponseEvent extends Event {
  type: 'response'
  response: {
    status: number
    statusText?: string
    headers?: OutgoingHttpHeaders
    content?: unknown
  }
  request: RequestId
}

type RequestId = string
interface RequestDetail {
  id: RequestId
  http: string
  method?: string
  url?: string
  headers: IncomingHttpHeaders
  content?: Readable
}
export interface RequestEvent extends Event {
  type: 'request' | 'responded'
  request: RequestDetail | RequestId
  connection?: ConnectionId
}

type IncomingMessageWithID = IncomingMessage & { id?: string; socket: SocketWithID }
server.on('request', async (req: IncomingMessageWithID, res) => {
  const id: RequestId = uuid()
  const request: RequestDetail = {
    id,
    http: req.httpVersion,
    method: req.method,
    url: req.url,
    headers: req.headers,
  }
  req.id = id
  const connection = req.socket.id
  if (req.headers['content-length']) {
    const length = parseInt(req.headers['content-length'])
    if (length > 0) request.content = req
  }

  const wait = core.wait<ResponseEvent>((ev) => ev.type === 'response' && ev.request === id)
  core.emit<RequestEvent>({ type: 'request', request, connection })
  const re = await wait
  const { status, statusText, headers, content } = re.response
  res.writeHead(status, statusText, headers)
  if (content) res.write(content)
  res.on('finish', () => core.emit<RequestEvent>({ type: 'responded', request: id, connection }))
  res.end()
})

server.listen(8520, () => {
  console.log('HTTP Server listen.', server.address())
})
