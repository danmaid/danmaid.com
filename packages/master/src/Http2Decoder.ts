import { Transform, TransformCallback, Readable } from 'node:stream'
import { OutgoingHttpHeaders, IncomingHttpStatusHeader } from 'node:http2'

declare global {
  interface Headers {
    entries(): Iterable<[String, String]>
  }
}
export type ResponseHeader = OutgoingHttpHeaders & IncomingHttpStatusHeader

export class Http2Decoder extends Transform {
  next: Buffer = Buffer.from([])
  type?: 'request' | 'response'
  status?: number
  method?: string
  target?: string
  headers = new Headers()
  headersEnd = false
  _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    if (this.headersEnd) return callback(null, chunk)
    try {
      const next = this.decode(Buffer.concat([this.next, chunk]))
      if (this.headersEnd) {
        this.next = Buffer.from([])
        return callback(null, next)
      }
      this.next = next
      callback()
    } catch (err: any) {
      callback(err)
    }
  }

  decode(buffer: Buffer): Buffer {
    const i = buffer.indexOf('\r\n')
    if (i === 0) {
      this.headersEnd = true
      this.type === 'request'
        ? this.emit('request', this.method, this.target, this.headers)
        : this.emit('response', this.status, this.headers)
      return buffer.subarray(2)
    }
    if (i > 0) {
      const line = buffer.subarray(0, i).toString('utf-8')
      if (this.type) {
        const i = line.indexOf(':')
        this.headers.append(line.slice(0, i), line.slice(i + 1).trim())
      } else {
        const type = this.type = line.startsWith('HTTP/') ? 'response' : 'request'
        const v = line.split(' ')
        if (type === 'request') {
          this.method = v[0]
          this.target = v[1]
        } else {
          this.status = parseInt(v[1])
        }
      }
      return this.decode(buffer.subarray(i + 2))
    }
    return buffer
  }

  async response(): Promise<{ headers: ResponseHeader, body: Readable }> {
    if (!this.headersEnd) await new Promise((resolve, reject) => {
      this.once('response', resolve)
      this.on('error', reject)
      this.on('end', reject)
    })
    if (this.type !== 'response') throw Error('is not contain response.')
    const headers = Object.fromEntries(this.headers.entries())
    headers[':status'] = this.status
    return { headers, body: this }
  }
}
