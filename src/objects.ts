import { mkdirSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import { dirname } from 'node:path'
import { writeFile, appendFile } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'
import { createInterface } from 'node:readline'

export interface ObjectStore {
  on(eventName: 'stored', listener: (id: string) => void): this
  on(eventName: string | symbol, listener: (...args: any[]) => void): this

  once(eventName: 'stored', listener: (id: string) => void): this
  once(eventName: string | symbol, listener: (...args: any[]) => void): this
}

export class ObjectStore extends EventEmitter {
  file = './data/events/store.jsonl'

  constructor() {
    super()
    mkdirSync(dirname(this.file), { recursive: true })
  }

  async set(id: string, data: Record<string, unknown>): Promise<void> {
    await appendFile(this.file, JSON.stringify({ ...data, id }) + '\n')
    this.emit('stored', id)
  }

  async get(id: string): Promise<Record<string, unknown>> {
    return await new Promise((resolve, reject) => {
      const rl = createInterface(createReadStream(this.file))
      rl.on('error', reject)
      rl.on('close', reject)
      rl.on('line', (line) => {
        const item = JSON.parse(line)
        if (item.id === id) resolve(item)
      })
    })
  }

  async getStream(id: string): Promise<Readable> {
    const item = await this.get(id)
    return Readable.from(JSON.stringify(item))
  }

  async copy(id: string, dest: string): Promise<void> {
    const item = await this.get(id)
    await writeFile(dest, JSON.stringify(item), 'utf-8')
  }
}

export const objects = new ObjectStore()
