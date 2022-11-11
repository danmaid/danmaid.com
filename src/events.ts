import { mkdirSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import { v4 as uuid } from 'uuid'
import { join } from 'node:path'
import { appendFile, writeFile } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'

export type EventListener<T = any> = (event: { id: string; date: Date; event: T; content?: boolean }) => void

export interface EventStore<T = any> {
  on(eventName: 'added', listener: EventListener<T>): this
  on(eventName: string | symbol, listener: (...args: any[]) => void): this

  once(eventName: 'added', listener: EventListener<T>): this
  once(eventName: string | symbol, listener: (...args: any[]) => void): this
}

export class EventStore<T extends Record<string, unknown> = any> extends EventEmitter {
  dir = './data/events'
  index = join(this.dir, 'index.jsonl')

  constructor() {
    super()
    mkdirSync(this.dir, { recursive: true })
  }

  async add(event: T, content?: Readable): Promise<{ id: string; date: Date; event: T; content?: boolean }> {
    const id = uuid()
    const e: Awaited<ReturnType<typeof this.add>> = { id, date: new Date(), event }
    if (content instanceof Readable) {
      e.content = true
      await writeFile(join(this.dir, id), content)
    }
    await appendFile(this.index, JSON.stringify(e) + '\n')
    this.emit('added', e)
    return e
  }

  async find(finder: (v: T) => boolean): Promise<T> {
    return await new Promise((resolve, reject) => {
      const reader = createInterface(createReadStream(this.index))
      reader.on('line', (line) => {
        const event = JSON.parse(line)
        if (finder(event)) resolve(event)
      })
      reader.on('error', reject)
      reader.on('close', reject)
    })
  }

  async filter(filter: (v: T & { id: string }) => boolean): Promise<(T & { id: string })[]> {
    return await new Promise((resolve, reject) => {
      const events: (T & { id: string })[] = []
      const reader = createInterface(createReadStream(this.index))
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
