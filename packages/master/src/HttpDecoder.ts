import { Transform, TransformCallback } from 'node:stream';
import { Readable } from 'stream';

export class HttpDecoder extends Transform {
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
}

export interface HttpDecoder {
  on(event: 'request', listener: (method: string, target: string, headers: Headers) => void): this
  on(event: 'response', listener: (status: number, headers: Headers) => void): this
  on(event: 'close', listener: () => void): this;
  on(event: 'data', listener: (chunk: any) => void): this;
  on(event: 'drain', listener: () => void): this;
  on(event: 'end', listener: () => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: 'finish', listener: () => void): this;
  on(event: 'pause', listener: () => void): this;
  on(event: 'pipe', listener: (src: Readable) => void): this;
  on(event: 'readable', listener: () => void): this;
  on(event: 'resume', listener: () => void): this;
  on(event: 'unpipe', listener: (src: Readable) => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this
  once(event: 'request', listener: (method: string, target: string, headers: Headers) => void): this
  once(event: 'response', listener: (status: number, headers: Headers) => void): this
  once(event: 'close', listener: () => void): this;
  once(event: 'data', listener: (chunk: any) => void): this;
  once(event: 'drain', listener: () => void): this;
  once(event: 'end', listener: () => void): this;
  once(event: 'error', listener: (err: Error) => void): this;
  once(event: 'finish', listener: () => void): this;
  once(event: 'pause', listener: () => void): this;
  once(event: 'pipe', listener: (src: Readable) => void): this;
  once(event: 'readable', listener: () => void): this;
  once(event: 'resume', listener: () => void): this;
  once(event: 'unpipe', listener: (src: Readable) => void): this;
  once(event: string | symbol, listener: (...args: any[]) => void): this
}
