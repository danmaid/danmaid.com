import { join, extname } from 'node:path'
import {
  readdirSync,
  statSync,
  accessSync,
  closeSync,
  openSync,
  mkdirSync,
  createReadStream,
  readFileSync,
} from 'node:fs'
import { appendFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { v4 as uuid } from 'uuid'

export class Index<T> {
  maxSize = 100000
  size = 0

  constructor(public path: string) {
    try {
      accessSync(path)
      this.size = readFileSync(path, { encoding: 'utf-8' }).split('\n').length - 1
    } catch (err) {
      closeSync(openSync(path, 'w'))
    }
  }

  async read(): Promise<T[]> {
    return await new Promise((resolve, reject) => {
      const items: T[] = []
      const rl = createInterface(createReadStream(this.path))
      rl.on('line', (line) => items.push(JSON.parse(line)))
      rl.on('error', () => reject())
      rl.on('close', () => resolve(items))
    })
  }

  async append(item: T): Promise<void> {
    if (this.maxSize <= this.size) throw RangeError('overflow')
    appendFile(this.path, JSON.stringify(item) + '\n', { encoding: 'utf-8' })
    this.size++
  }
}

export class Store<T extends Record<string, unknown> = Record<string, unknown>> {
  dir = './data'
  indexes: Index<T>[]
  get current(): Index<T> {
    return this.indexes[this.indexes.length - 1]
  }

  constructor() {
    mkdirSync(this.dir, { recursive: true })
    this.indexes = this.loadIndex()
    if (this.indexes.length < 1) this.addIndex()
  }

  addIndex(): void {
    this.indexes.push(new Index(join(this.dir, `${uuid()}.jsonl`)))
  }

  loadIndex(): Index<T>[] {
    return readdirSync(this.dir, { withFileTypes: true })
      .filter((v) => extname(v.name) === '.jsonl')
      .map((v) => ({ ...statSync(join(this.dir, v.name)), ...v }))
      .sort()
      .map((v) => new Index(join(this.dir, v.name)))
  }

  async add(item: T): Promise<string> {
    const x = { date: new Date(), ...item, id: uuid() }
    try {
      await this.current.append(x)
    } catch {
      this.addIndex()
      await this.current.append(x)
    }
    return x.id
  }

  async get(id: string): Promise<T> {
    for (const index of this.indexes) {
      const x = await index.read()
      const t = x.find((v) => v.id === id)
      if (t) return t
    }
    throw new RangeError(`${id} is not found.`)
  }

  async filter(fn: (v: T) => boolean): Promise<T[]> {
    const items = []
    for (const index of this.indexes) {
      const x = await index.read()
      items.push(...x.filter(fn))
    }
    return items
  }
}
