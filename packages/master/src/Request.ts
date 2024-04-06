import { IncomingHttpHeaders } from 'node:http2'
import { Readable } from 'node:stream'

export class Request extends globalThis.Request {
  static async from(request: Readable & { url: string, method: string, headers: IncomingHttpHeaders }): Promise<Request> {
    const headers = new Headers()
    Object.entries(request.headers).forEach(([k, v]) => headers.set(k, String(v)))
    const buffer = await new Promise<Buffer>(resolve => {
      const chunks: Buffer[] = []
      request.on('data', (chunk: Buffer) => chunks.push(chunk))
      request.once('end', () => resolve(Buffer.concat(chunks)))
    })
    const body = buffer.length > 0 ? buffer : undefined
    return new this(request.url, { method: request.method, headers, body })
  }
}

// class Request {
//   static async from(req: Http2ServerRequest): Promise<Request> {
//     const body = await new Promise<Buffer>((resolve) => {
//       const chunks: Buffer[] = []
//       req.on('data', (chunk: Buffer) => chunks.push(chunk))
//       req.once('end', () => resolve(Buffer.concat(chunks)))
//     })
//     return new this(req.method, req.url, req.httpVersion, req.headers, body)
//   }
3
//   readonly headers: IncomingHttpHeaders
//   constructor(
//     readonly method: string,
//     readonly target: string,
//     readonly version: string,
//     headers: IncomingHttpHeaders,
//     readonly body: Buffer
//   ) {
//     this.headers = Object.fromEntries(Object.entries(headers).filter(([k]) => !k.startsWith(':')))
//   }

//   stream(): Readable {
//     const fields = Object.entries(this.headers)
//       .filter(([k, v]) => !k.startsWith(':'))
//       .map(([k, v]) => Buffer.from(`${k}: ${v}\r\n`))
//     return Readable.from(Buffer.concat([
//       Buffer.from(`${this.method} ${this.target} HTTP/${this.version}\r\n`),
//       ...fields,
//       Buffer.from('\r\n'),
//       this.body
//     ]))
//   }

//   toJSON() {
//     const { method, target, version, headers } = this
//     return { method, target, version, headers }
//   }
// }

