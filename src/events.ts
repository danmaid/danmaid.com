import { mkdirSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import { v4 as uuid } from 'uuid'
import { join } from 'node:path'
import { appendFile } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

export type EventListener<T = any> = (event: { id: string; date: Date; event: T }) => void

export interface EventStore<T = any> {
  on(eventName: 'added', listener: EventListener<T>): this
  on(eventName: string | symbol, listener: (...args: any[]) => void): this

  once(eventName: 'added', listener: (event: { id: string; date: Date; event: T }) => void): this
  once(eventName: string | symbol, listener: (...args: any[]) => void): this
}

export class EventStore<T = any> extends EventEmitter {
  dir = './data/events'
  file = join(this.dir, 'index.jsonl')

  constructor() {
    super()
    mkdirSync(this.dir, { recursive: true })
  }

  async add(event: T): Promise<string> {
    const id = uuid()
    const e = { id, date: new Date(), event }
    await appendFile(this.file, JSON.stringify(e) + '\n')
    this.emit('added', e)
    return id
  }

  async filter(filter: (v: T & { id: string }) => boolean): Promise<(T & { id: string })[]> {
    return await new Promise((resolve, reject) => {
      const events: (T & { id: string })[] = []
      const reader = createInterface(createReadStream(this.file))
      reader.on('line', (line) => {
        const event = JSON.parse(line)
        if (filter(event)) events.push(event)
      })
      reader.on('error', reject)
      reader.on('close', () => resolve(events))
    })
  }
}

export const events = new EventStore()
