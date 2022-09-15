import { EventEmitter } from 'node:events'
import { Readable } from 'node:stream'
import { createWriteStream, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { v4 as uuid } from 'uuid'
import { IndexStore } from './IndexStore'

type Meta = { id: string; type?: string }
export interface DataStore {
  on(eventName: 'added', listener: (meta: Meta) => void): this
}

export class DataStore extends EventEmitter {
  index = new IndexStore<Meta>()
  dir: string

  constructor(options?: { dir?: string }) {
    super()
    this.dir = options?.dir || resolve('./data')
    mkdirSync(this.dir, { recursive: true })
  }

  async add(content: Readable, type?: string): Promise<Meta> {
    return await new Promise((resolve, reject) => {
      const id = uuid()
      const out = createWriteStream(join(this.dir, id))
      out.on('finish', () => {
        const meta: Meta = { id, type }
        this.index.add(meta)
        this.emit('added', meta)
        resolve(meta)
      })
      out.on('error', reject)
      content.pipe(out)
    })
  }
}
