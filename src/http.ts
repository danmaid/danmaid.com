import { createServer, IncomingMessage, IncomingHttpHeaders, OutgoingHttpHeaders } from 'http'
import { v4 as uuid } from 'uuid'
import { Socket, AddressInfo } from 'node:net'
import { core, Event } from './core'
import { Readable } from 'node:stream'

export const server = createServer()

export interface ConnectionEvent extends Event {
  type: 'connected' | 'disconnected'
  connection: string
  remote?: Partial<AddressInfo>
}

type SocketWithID = Socket & { id?: string }
server.on('connection', (socket: SocketWithID) => {
  const id = uuid()
  socket.id = id
  socket.once('close', () => {
    core.emit<ConnectionEvent>({ type: 'disconnected', connection: id })
  })
  core.emit<ConnectionEvent>({
    type: 'connected',
    connection: id,
    remote: {
      address: socket.remoteAddress,
      family: socket.remoteFamily,
      port: socket.remotePort,
    },
  })
})

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

function hasContent(headers: IncomingHttpHeaders): boolean {
  if (headers['content-length']) {
    const length = parseInt(headers['content-length'])
    if (length > 0) return true
  }
  return false
}

type IncomingMessageWithID = IncomingMessage & { id?: string; socket: SocketWithID }
server.on('request', async (req: IncomingMessageWithID, res) => {
  const id = uuid()
  req.id = id
  const content = hasContent(req.headers) ? req : undefined
  const url = req.url ? new URL(req.url, `http://${req.headers.host}`) : undefined

  const wait = core.wait<ResponseEvent>((ev) => ev.type === 'response' && ev.request === id)
  core.emit<RequestEvent>({
    type: 'request',
    request: id,
    http: req.httpVersion,
    method: req.method,
    url: req.url,
    headers: req.headers,
    connection: req.socket.id,
    content,
    path: url?.pathname,
  })
  const response = await wait
  const { status, statusText, headers } = response
  res.writeHead(status, statusText, headers)
  if (response.content) {
    if (response.content instanceof Readable) {
      const content = response.content
      content.pipe(res)
      await new Promise((r) => content.on('end', r))
    } else res.write(response.content)
  }
  res.on('finish', () => core.emit<RequestEvent>({ type: 'responded', request: id }))
  res.end()
})

server.listen(8520, () => {
  console.log('HTTP Server listen.', server.address())
})
