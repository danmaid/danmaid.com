import { EventEmitter } from 'node:events'
import { mkdirSync } from 'node:fs'
import { writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

export interface Store<T = Record<string, unknown>> {
  on(eventName: 'deleted', listener: (id: string) => void): this
  on(eventName: 'updated', listener: (id: string, data: T) => void): this
  on(eventName: string | symbol, listener: (...args: any[]) => void): this

  once(eventName: 'deleted', listener: (id: string) => void): this
  once(eventName: 'updated', listener: (id: string, data: T) => void): this
  once(eventName: string | symbol, listener: (...args: any[]) => void): this
}

export class Store<T = Record<string, unknown>> extends EventEmitter {
  dir = './data/contents'

  constructor() {
    super()
    mkdirSync(this.dir, { recursive: true })
  }

  async set(id: string, data: T): Promise<void> {
    await writeFile(join(this.dir, id), JSON.stringify(data))
    this.emit('updated', id, data)
  }

  async delete(id: string): Promise<void> {
    await rm(join(this.dir, id))
    this.emit('deleted', id)
  }
}

export const store = new Store()
