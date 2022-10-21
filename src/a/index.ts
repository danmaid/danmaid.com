import { resolve, dirname } from 'node:path'
import { mkdirSync, closeSync, openSync, createReadStream } from 'node:fs'
import { appendFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { Event } from '../core'

type Reviver = Parameters<JSON['parse']>[1]

export class Index<T extends Event = Event> {
  dir: string
  file: string
  reviver: Reviver = (k, v) => (k === 'date' ? new Date(v) : v)

  constructor(dir: string = 'data/events') {
    this.dir = dir
    this.file = resolve(dir, 'index.jsonl')
    mkdirSync(dirname(this.file), { recursive: true })
    closeSync(openSync(this.file, 'a'))
  }

  add(ev: T) {
    return appendFile(this.file, JSON.stringify(ev) + '\n')
  }

  set() {}
  delete() {}

  get({ id }: T): Promise<T> {
    return new Promise((resolve, reject) => {
      const file = createReadStream(this.file)
      const reader = createInterface(file)
      reader.on('line', (line) => {
        const event: T = JSON.parse(line, this.reviver)
        if (event.id === id) resolve(event)
      })
      reader.on('close', () => reject())
    })
  }

  filter(fn: (ev: T) => boolean): Promise<T[]> {
    return new Promise((resolve) => {
      const reader = createInterface(createReadStream(this.file))
      const items: T[] = []
      reader.on('line', (line) => {
        const event = JSON.parse(line, this.reviver)
        fn(event) && items.push(event)
      })
      reader.on('close', () => resolve(items))
    })
  }
}
