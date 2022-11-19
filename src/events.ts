import { mkdirSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import { v4 as uuid } from 'uuid'
import { join } from 'node:path'
import { appendFile, writeFile, copyFile, readFile } from 'node:fs/promises'
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
  store = join(this.dir, 'store.jsonl')

  constructor() {
    super()
    mkdirSync(this.dir, { recursive: true })
  }

  async add(event: T, content?: Readable): Promise<{ id: string; date: Date; event: T; content?: boolean }> {
    const id = uuid()
    const e: Awaited<ReturnType<typeof this.add>> = { id, date: new Date(), event }
    if (content) {
      if (event['content-type'] === 'application/json') {
        const data: Record<string, unknown> = await new Promise((resolve) => {
          let data = ''
          content.on('data', (chunk) => (data += chunk))
          content.on('end', () => resolve(JSON.parse(data)))
        })
        await appendFile(this.store, JSON.stringify({ ...data, _id: id }) + '\n')
        e.event = { ...e.event, ...data }
      } else await writeFile(join(this.dir, id), content)
    }
    await appendFile(this.index, JSON.stringify(e) + '\n')
    this.emit('added', e)
    return e
  }

  async filter(filter: (v: T & { id: string }) => boolean): Promise<(T & { _id: string })[]> {
    return await new Promise((resolve, reject) => {
      const events: (T & { _id: string })[] = []
      const reader = createInterface(createReadStream(this.index))
      reader.on('line', (line) => {
        const event = JSON.parse(line)
        if (filter(event)) events.push(event)
      })
      reader.on('error', reject)
      reader.on('close', () => resolve(events))
    })
  }

  async getJsonContent(id: string): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const rl = createInterface(createReadStream(this.store))
      rl.on('error', reject)
      rl.on('close', reject)
      rl.on('line', (line) => {
        const item = JSON.parse(line)
        if (item._id === id) resolve(item)
      })
    })
  }

  async getContent(id: string, type?: string): Promise<Record<string, unknown> | string> {
    return type === 'application/json' ? this.getJsonContent(id) : readFile(join(this.dir, id), 'utf-8')
  }

  async getJsonContentStream(id: string): Promise<Readable> {
    const item = await this.getJsonContent(id)
    return Readable.from(JSON.stringify(item))
  }

  async getContentStream(id: string, type?: string): Promise<Readable> {
    return type === 'application/json' ? this.getJsonContentStream(id) : createReadStream(join(this.dir, id))
  }

  async copyJsonContent(id: string, dest: string): Promise<void> {
    const item = await this.getJsonContent(id)
    await writeFile(dest, JSON.stringify(item), 'utf-8')
  }

  async copyContent(id: string, dest: string, type?: string): Promise<void> {
    return type === 'application/json' ? this.copyJsonContent(id, dest) : copyFile(join(this.dir, id), dest)
  }
}

export const events = new EventStore()
