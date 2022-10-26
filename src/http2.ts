import { Core, Event } from './core'
import { Server, IncomingMessage, ServerResponse, OutgoingHttpHeaders } from 'node:http'
import { v4 as uuid } from 'uuid'

interface ResponseEvent {
  type: 'response'
  request: string
  status?: number
  message?: string
  headers?: OutgoingHttpHeaders
}
function isResponseEvent(ev: any): ev is ResponseEvent {
  if (ev.type !== 'response') return false
  if (typeof ev.request !== 'string') return false
  if (ev.status && typeof ev.status !== 'number') return false
  if (ev.message && typeof ev.message !== 'string') return false
  if (ev.headers && typeof ev.headers !== 'object') return false
  return true
}

class Responses extends Map<string, ServerResponse> {
  set(id: string, res: ServerResponse): this {
    res.once('close', () => this.delete(id))
    return super.set(id, res)
  }
}

export class HttpServer extends Server {
  responses = new Responses()

  constructor(private core: Core) {
    super((req, res) => this.onrequest(req, res))
    core.on<ResponseEvent & Event>(isResponseEvent, this.onresponse)
  }

  onrequest(req: IncomingMessage, res: ServerResponse) {
    const id = uuid()
    this.responses.set(id, res)

    const { url, headers, method, httpVersion } = req
    if (!url) return console.warn('url not found.')
    const { pathname } = new URL(url, `http://${headers.host}`)

    // emit request event
    const { socket } = req
    const client = { address: socket.remoteAddress, family: socket.remoteFamily, port: socket.remotePort }
    const request = { client, http: httpVersion, method, url, ...headers }
    this.core.emit({ ...request, id, type: 'request' })
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
}
