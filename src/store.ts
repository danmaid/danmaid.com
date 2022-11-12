import { mkdirSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import { join } from 'node:path'
import { writeFile, readFile, copyFile, rm } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'

export interface FileStore {
  on(eventName: 'stored', listener: (id: string) => void): this
  on(eventName: string | symbol, listener: (...args: any[]) => void): this

  once(eventName: 'stored', listener: (id: string) => void): this
  once(eventName: string | symbol, listener: (...args: any[]) => void): this
}

export class FileStore extends EventEmitter {
  dir = './data/events'

  constructor() {
    super()
    mkdirSync(this.dir, { recursive: true })
  }

  async set(id: string, data: Readable): Promise<void> {
    await writeFile(join(this.dir, id), data)
    this.emit('stored', id)
  }

  async get(id: string): Promise<string> {
    return await readFile(join(this.dir, id), 'utf-8')
  }

  async getStream(id: string): Promise<Readable> {
    return createReadStream(join(this.dir, id))
  }

  async copy(id: string, dest: string): Promise<void> {
    await copyFile(join(this.dir, id), dest)
  }
}

export const store = new FileStore()
