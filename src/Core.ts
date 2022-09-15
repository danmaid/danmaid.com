import { EventEmitter } from 'node:events'

export class Core extends EventEmitter {
  #all = Symbol('all')

  emit(eventName: string | symbol, ...args: any[]): boolean {
    super.emit(this.#all, eventName, ...args)
    return super.emit(eventName, ...args)
  }

  onAll(listener: (eventName: string | symbol, ...args: any[]) => void): this {
    return super.on(this.#all, listener)
  }
  offAll(listener: (...args: any[]) => void): this {
    return super.off(this.#all, listener)
  }
}
