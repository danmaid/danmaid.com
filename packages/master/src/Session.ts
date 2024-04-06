import { Http2ServerRequest, Http2ServerResponse } from 'node:http2'
import { Readable, Transform } from 'node:stream'
import { ResponseHeader } from './Http2Decoder'

export class Session {
  response?: { status: number, headers: Headers }
  reqeustBody: Buffer[] = []
  responseBody: Buffer[] = []
  constructor(readonly req: Http2ServerRequest, readonly socket: Http2ServerResponse) {
    socket.setTimeout(5000, () => socket.writeHead(501).end())
    req.on('data', (chunk: Buffer) => this.reqeustBody.push(chunk))
  }

  #respond?: Promise<unknown>
  async respondWith(response: Promise<{ headers: ResponseHeader, body: Readable }>): Promise<void> {
    if (this.#respond) throw Error('InvalidStateError')
    this.#respond = response
    const { headers, body } = await response
    const { ":status": status, ...h } = headers
    this.socket.stream.respond(headers)
    body.pipe(new Transform({
      transform: (chunk, encoding, callback) => {
        this.responseBody.push(chunk)
        callback(null, chunk)
      },
    })).pipe(this.socket.stream)
  }

  stream(): Readable {
    const chunks: Buffer[] = []
    chunks.push(Buffer.from(`${this.req.method} ${this.req.url} HTTP/${this.req.httpVersion}\r\n`))
    for (const [k, v] of Object.entries(this.req.headers)) {
      if (k.startsWith(':')) continue
      chunks.push(Buffer.from(`${k}: ${v}\r\n`))
    }
    chunks.push(Buffer.from('\r\n'))
    chunks.push(...this.reqeustBody)
    if (this.response) {
      chunks.push(Buffer.from(`HTTP/1.1 ${this.response.status}`))
      this.response.headers.forEach((v, k) => {
        if (k.startsWith(':')) return
        chunks.push(Buffer.from(`${k}: ${v}\r\n`))
      })
      chunks.push(Buffer.from('\r\n'))
      chunks.push(...this.responseBody)
    }
    return Readable.from(chunks)
  }

  toJSON() {
    const headers = Object.fromEntries(Object.entries(this.req.headers).filter(([k]) => !k.startsWith(':')))
    const request = { method: this.req.method, url: this.req.url, headers }
    if (this.response) {
      const headers: [string, string][] = []
      this.response.headers.forEach((v, k) => headers.push([k, v]))
      const response = { ...this.response, headers: Object.fromEntries(headers) }
      return { request, response }
    }
    return { request }
  }
}
