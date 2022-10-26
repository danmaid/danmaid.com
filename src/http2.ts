import { Core } from './core'
import { Server, IncomingMessage, ServerResponse, OutgoingHttpHeaders } from 'node:http'
import { v4 as uuid } from 'uuid'
import { Socket, AddressInfo } from 'node:net'

export interface ResponseEvent {
  type: 'response'
  request: string
  status?: number
  message?: string
  headers?: OutgoingHttpHeaders
}
export function isResponseEvent(ev: any): ev is ResponseEvent {
  if (ev.type !== 'response') return false
  if (typeof ev.request !== 'string') return false
  if (ev.status && typeof ev.status !== 'number') return false
  if (ev.message && typeof ev.message !== 'string') return false
  if (ev.headers && typeof ev.headers !== 'object') return false
  return true
}

export interface ConnectionEvent {
  type: 'connected' | 'disconnected'
  id: string
  remote?: Partial<AddressInfo>
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
    this.responses.set(id, res)

    const { url, headers, method, httpVersion, socket } = req
    if (!url) return console.warn('url not found.')
    const { pathname, hash, searchParams } = new URL(url, `http://${headers.host}`)
    const query = Object.fromEntries(searchParams)

    this.core.emit({
      type: 'request',
      id,
      connection: socket.id,
      http: httpVersion,
      method,
      url,
      path: pathname,
      query,
      hash,
      ...headers,
    })
  }

  onresponse(ev: ResponseEvent) {
    const res = this.responses.get(ev.request)
    if (!res) return
    if (ev.headers) Object.entries(ev.headers).forEach(([k, v]) => v && res.setHeader(k, v))
    if (ev.status) res.statusCode = ev.status
    if (ev.message) res.statusMessage = ev.message
    res.end()
    this.core.emit({ type: 'responded' })
  }

  onconnection(socket: Socket & { id?: string }) {
    const id = uuid()
    this.clients.set(id, socket)
    const { remoteAddress, remoteFamily, remotePort } = socket
    const remote = { address: remoteAddress, family: remoteFamily, port: remotePort }
    socket.id = id
    this.core.emit<ConnectionEvent>({ type: 'connected', id, remote })
    socket.once('close', () => this.core.emit<ConnectionEvent>({ type: 'disconnected', id }))
  }

  close(callback?: ((err?: Error | undefined) => void) | undefined): this {
    this.clients.forEach((v) => v.destroy())
    return super.close(callback)
  }
}
