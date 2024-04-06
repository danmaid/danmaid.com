import { connect } from 'node:http2'
import { readFileSync } from 'node:fs'
import { Readable } from 'node:stream'
import { HttpDecoder } from './HttpDecoder'

const ca = readFileSync('./localhost.crt', 'utf-8')

interface SlaveEventMap {
  request: RequestEvent
  message: MessageEvent
}
export interface Slave {
  addEventListener<K extends keyof SlaveEventMap>(type: K, listener: (event: SlaveEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void
}

export class Slave extends EventTarget {
  constructor() {
    super()
    // const session = connect('https://nanopi-r1.1.danmaid.com/', { ca, rejectUnauthorized: false })
    const session = connect('https://localhost', { ca })
    const stream = session.request({ accept: 'text/event-stream' })
    const chunks: Buffer[] = []
    stream.on('data', async (chunk) => {
      chunks.push(chunk)
      const buffer = Buffer.concat(chunks)
      const i = buffer.indexOf('\n\n')
      if (i < 0) return
      chunks.splice(0)
      chunks.push(buffer.subarray(i + 2))
      const payload = buffer.subarray(0, i + 1).toString()
      const type = payload.match(/event: (.*)\n/)?.[1]
      const data = payload.match(/data: (.*)\n/)?.[1]
      const lastEventId = payload.match(/id: (.*)\n/)?.[1]
      if (!data) return console.warn('invalid data.', payload)
      if (type) return
      this.dispatchEvent(new MessageEvent(type || 'message', { data, lastEventId }))

      const stream = session.request({ ':path': data, accept: 'application/http' })
      const http = stream.pipe(new HttpDecoder())
      http.on('request', async (method, target, headers) => {
        const event = RequestEvent.from(method, target, headers, http)
        this.dispatchEvent(event)
        if (event.response) {
          try {
            const { status, headers, body } = await event.response
            const stream = session.request({ ':path': data, ':method': 'POST', 'content-type': 'application/http' })
            stream.write(`HTTP/1.1 ${status}\r\n`)
            headers.forEach((v, k) => k.startsWith(':') || stream.write(`${k}: ${v}\r\n`))
            stream.write('\r\n')
            body ? body.pipe(stream) : stream.end()
          } catch (err) {
            console.error(err)
            const stream = session.request({ ':path': data, ':method': 'POST', 'content-type': 'application/http' })
            stream.end(`HTTP/1.1 500\r\n\r\n${err}`)
          }
        }
      })
    })
  }
}

export class RequestEvent extends Event {
  static from(method: string, url: string, headers: Headers, body: Readable) {
    return new this(new Request(method, url, headers, body))
  }
  private constructor(readonly request: Request) {
    super('request')
  }
  response?: Response | Promise<Response>
  respondWith(response: Response | Promise<Response>) {
    this.response = response
  }
}

export class Request {
  readonly url: string
  constructor(readonly method: string, url: string, readonly headers: Headers, readonly body: Readable) {
    // this.url = new URL(url, 'https://nanopi-r1.1.danmaid.com/').toString()
    this.url = new URL(url, 'https://localhost').toString()
  }
}

export class Response {
  readonly status: number
  readonly headers: Headers
  readonly body: Readable | null
  constructor(body?: Readable | null, init?: ResponseInit) {
    this.body = body || null
    this.status = init?.status || 200
    this.headers = new Headers(init?.headers)
  }
}
