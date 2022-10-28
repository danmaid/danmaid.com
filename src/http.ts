import { Core } from './core'
import { Server, IncomingMessage, ServerResponse, OutgoingHttpHeaders, IncomingHttpHeaders } from 'node:http'
import { v4 as uuid } from 'uuid'
import { Socket, AddressInfo } from 'node:net'
import { Readable } from 'node:stream'

export interface RequestEvent {
  type: 'request'
  request: string
  connection?: string
  http: string
  method?: string
  url: string
  path: string
  query: Record<string, string>
  hash: string
  content?: IncomingMessage
}
export function isRequestEvent(ev: any): ev is RequestEvent {
  if (ev.type !== 'request') return false
  if (typeof ev.id !== 'string') return false
  if (!/^[/\w]+$/.test(ev.path)) return false
  if ('content' in ev && !(ev.content instanceof Readable)) return false
  return true
}

export interface ResponseEvent {
  type: 'response'
  request: string
  status?: number
  message?: string
  headers?: OutgoingHttpHeaders
  content?: Readable
}
export function isResponseEvent(ev: any): ev is ResponseEvent {
  if (ev.type !== 'response') return false
  if (typeof ev.request !== 'string') return false
  if ('status' in ev && typeof ev.status !== 'number') return false
  if ('message' in ev && typeof ev.message !== 'string') return false
  if ('headers' in ev && typeof ev.headers !== 'object') return false
  if ('content' in ev && !(ev.content instanceof Readable)) return false
  return true
}

export interface ConnectionEvent extends Partial<AddressInfo> {
  type: 'connected' | 'disconnected'
  id: string
}

class CloseDeleteMap<T extends { once: (event: 'close', listener: () => void) => void }> extends Map<string, T> {
  set(k: string, v: T): this {
    v.once('close', () => this.delete(k))
    return super.set(k, v)
  }
}

export class HttpServer extends Server {
  responses = new CloseDeleteMap<ServerResponse>()
  clients = new CloseDeleteMap<Socket>()

  constructor(private core: Core) {
    super()
    core.on(isResponseEvent, (ev) => {
      this.emit('response', ev)
    })
    this.on('request', (req, res) => this.onrequest(req, res))
    this.on('response', (ev: ResponseEvent) => this.onresponse(ev))
    this.on('connection', (socket) => this.onconnection(socket))
  }

  onrequest(req: IncomingMessage & { socket: { id?: string } }, res: ServerResponse) {
    const id = uuid()
    const { url, headers, method, httpVersion, socket } = req
    this.responses.set(id, res)

    if (!url) return console.warn('url not found.')
    const { pathname, hash, searchParams } = new URL(url, `http://${headers.host}`)
    const query = Object.fromEntries(searchParams)

    const event: RequestEvent = {
      ...headers,
      type: 'request',
      request: id,
      connection: socket.id,
      http: httpVersion,
      method,
      url,
      path: pathname,
      query,
      hash,
    }
    if (headers['content-length']) event.content = req

    this.core.emit(event)
  }

  async onresponse(ev: ResponseEvent) {
    const { request, headers, status, message, content } = ev
    const res = this.responses.get(request)
    if (!res) return
    if (headers) Object.entries(headers).forEach(([k, v]) => v && res.setHeader(k, v))
    if (status) res.statusCode = status
    if (message) res.statusMessage = message
    content ? content.pipe(res) : res.end()
    await new Promise((r) => res.on('finish', r))
    this.core.emit({ type: 'responded', request })
  }

  onconnection(socket: Socket & { id?: string }) {
    const id = uuid()
    const { remoteAddress, remoteFamily, remotePort } = socket
    this.clients.set(id, socket)
    socket.id = id
    this.core.emit<ConnectionEvent>({
      type: 'connected',
      id,
      address: remoteAddress,
      family: remoteFamily,
      port: remotePort,
    })
    socket.once('close', () => this.core.emit<ConnectionEvent>({ type: 'disconnected', id }))
  }

  close(callback?: ((err?: Error | undefined) => void) | undefined): this {
    this.clients.forEach((v) => v.destroy())
    return super.close(callback)
  }
}
