import { EventEmitter } from 'node:events'
import { v4 as uuid } from 'uuid'
import { appendFile } from 'node:fs/promises'
import { createReadStream, mkdirSync, closeSync, openSync, createWriteStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { dirname, resolve } from 'node:path'
import { Readable } from 'node:stream'

export interface EventMeta extends Record<string, unknown> {
  id: string
  date: Date
  type: string
}

export interface EventStream {
  emit(eventName: 'event', event: EventMeta, content?: unknown): boolean
  emit(eventName: string | symbol, ...args: any[]): boolean

  on(eventName: 'event', listener: (event: EventMeta, content?: unknown) => void): this
  on(eventName: string | symbol, listener: (...args: any[]) => void): this
}

export class EventStream extends EventEmitter {
  dir = 'data/events'
  indexFile = resolve(this.dir, 'index.jsonl')

  constructor() {
    super()
    mkdirSync(dirname(this.indexFile), { recursive: true })
    closeSync(openSync(this.indexFile, 'a'))
  }

  async add(meta: Omit<EventMeta, 'id'>, content?: Readable): Promise<string> {
    const event = { id: uuid(), date: new Date(), type: 'created', ...meta }
    if (content instanceof Readable) {
      const writer = createWriteStream(resolve(this.dir, event.id))
      content.pipe(writer)
      await new Promise((r) => content.on('end', r))
    }
    await appendFile(this.indexFile, JSON.stringify(event) + '\n')
    this.emit('event', event)
    return event.id
  }

  get(id: string): Promise<EventMeta> {
    return new Promise<EventMeta>((resolve, reject) => {
      const reader = createInterface(createReadStream(this.indexFile))
      reader.on('line', (line) => {
        const event: EventMeta = JSON.parse(line)
        if (event.id === id) resolve({ ...event, date: new Date(event.date) })
      })
      reader.on('close', () => reject())
    })
  }

  filter(predicate: (meta: EventMeta) => boolean): Promise<EventMeta[]> {
    return new Promise<EventMeta[]>((resolve) => {
      const reader = createInterface(createReadStream(this.indexFile))
      const items: EventMeta[] = []
      reader.on('line', (line) => {
        const event = JSON.parse(line, (k, v) => (k === 'date' ? new Date(v) : v))
        predicate(event) && items.push(event)
      })
      reader.on('close', () => resolve(items))
    })
  }
}

export const events = new EventStream()
