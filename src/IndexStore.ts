import { EventEmitter } from 'node:events'

export class IndexStore<T> extends EventEmitter {
  index: T[] = []

  async add(value: T) {
    this.index.push(value)
  }
}
