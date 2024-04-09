import { Writable } from 'node:stream'
import { Readable } from 'stream'

export class EventStreamDecoder extends Writable {
  buffer = Buffer.from([])
  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.buffer = this.decode(Buffer.concat([this.buffer, chunk]))
    callback()
  }
  _final(callback: (error?: Error | null) => void): void {
    this.decode(this.buffer)
    callback()
  }

  decode(buffer: Buffer): Buffer {
    const i = buffer.indexOf('\n\n')
    if (i < 0) return buffer
    const v = buffer.subarray(0, i).toString()
    const event = v.match(/event: (.*)\n/)?.[1]
    const data = v.match(/data: (.*)\n/)?.[1]
    if (data) this.emit('event', { event, data })
    return this.decode(buffer.subarray(i + 1))
  }
}

export interface EventStreamDecoder {
  on(event: 'event', listener: (event: { event?: string, data: string }) => void): this
  on(event: 'close', listener: () => void): this
  on(event: 'drain', listener: () => void): this
  on(event: 'error', listener: (err: Error) => void): this
  on(event: 'finish', listener: () => void): this
  on(event: 'pipe', listener: (src: Readable) => void): this
  on(event: 'unpipe', listener: (src: Readable) => void): this
  on(event: string | symbol, listener: (...args: any[]) => void): this
}