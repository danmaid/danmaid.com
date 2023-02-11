import { Readable } from 'node:stream'
import { join } from 'node:path'
import { Jsonl } from './jsonl'
import { v4 as uuid } from 'uuid'

export class Store<T extends Record<string, unknown> = Record<string, unknown>> {
  dir = './data'
  indexFile = 'index.jsonl'
  cache: T[] = []
  next = join(this.dir, 'next')
  maxSize = 100000
  ready: Promise<void>
  index: Jsonl<T>

  constructor(options?: { dir?: string; cache?: boolean }) {
    Object.assign(this, options)
    this.index = new Jsonl(join(this.dir, this.indexFile))
    this.ready = options?.cache ? this.load() : Promise.resolve()
  }

  async load(): Promise<void> {
    this.cache = await this.index.read()
  }

  async add(meta: { id?: null } & T, content?: Readable): Promise<{ id: string; date: Date } & T> {
    const x = { date: new Date(), ...meta, id: uuid() }
    await this.index.append(x)
    return x
  }
}

const store = new Store()
export default store
