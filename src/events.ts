import { mkdirSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import { v4 as uuid } from 'uuid'
import { join } from 'node:path'
import { readdir, readFile, writeFile } from 'node:fs/promises'

export class EventStore<T = any> extends EventEmitter {
  dir = './data/events'

  constructor() {
    super()
    mkdirSync(this.dir, { recursive: true })
  }

  async add(event: T): Promise<string> {
    const id = uuid()
    const e = { id, date: new Date(), event }
    await writeFile(join(this.dir, id), JSON.stringify(e))
    this.emit('added', e)
    return id
  }

  async filter(filter: (v: T & { id: string }) => boolean): Promise<(T & { id: string })[]> {
    const files = await readdir(this.dir)
    const items = files.map(async (file): Promise<T & { id: string; date: string }> => {
      const text = await readFile(join(this.dir, file), { encoding: 'utf-8' })
      return JSON.parse(text)
    })
    const data = await Promise.all(items)
    return data.filter(filter).sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0))
  }
}

export const events = new EventStore()
