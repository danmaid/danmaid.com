import { EventEmitter } from 'node:events'
import { v4 as uuid } from 'uuid'
import { appendFile } from 'node:fs/promises'
import { createReadStream, mkdirSync, closeSync, openSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { dirname } from 'node:path'

export interface EventMeta extends Record<string, unknown> {
  id: string
  date: Date
  type: string
}

export interface EventStream<T extends EventMeta> {
  emit(eventName: 'event', event: T): boolean
  emit(eventName: string | symbol, ...args: any[]): boolean

  on(eventName: 'event', listener: (event: T) => void): this
  on(eventName: string | symbol, listener: (...args: any[]) => void): this
}

export class EventStream<T extends EventMeta> extends EventEmitter {
  indexFile = 'data/events/index.jsonl'

  constructor() {
    super()
    mkdirSync(dirname(this.indexFile), { recursive: true })
    closeSync(openSync(this.indexFile, 'a'))
  }

  async add(meta: Omit<T, 'id'>): Promise<string> {
    const event = { id: uuid(), date: new Date(), type: 'created', ...meta }
    await appendFile(this.indexFile, JSON.stringify(event) + '\n')
    this.emit('event', event)
    return event.id
  }

  get(id: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const reader = createInterface(createReadStream(this.indexFile))
      reader.on('line', (line) => {
        const event: T = JSON.parse(line)
        if (event.id === id) resolve({ ...event, date: new Date(event.date) })
      })
      reader.on('close', () => reject())
    })
  }

  filter(predicate: (meta: T) => boolean): Promise<T[]> {
    return new Promise<T[]>((resolve) => {
      const reader = createInterface(createReadStream(this.indexFile))
      const items: T[] = []
      reader.on('line', (line) => {
        const event = JSON.parse(line, (k, v) => (k === 'date' ? new Date(v) : v))
        predicate(event) && items.push(event)
      })
      reader.on('close', () => resolve(items))
    })
  }
}

export const events = new EventStream()
