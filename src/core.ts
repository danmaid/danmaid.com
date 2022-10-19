import { EventEmitter } from 'node:events'
import { EventMeta, events } from './events'

export interface Core {
  on(eventName: 'event', listener: (meta: EventMeta) => void): this
  on(eventName: string | symbol, listener: (...args: any[]) => void): this

  once(eventName: 'event', listener: (meta: EventMeta) => void): this
  once(eventName: string | symbol, listener: (...args: any[]) => void): this
}
export class Core extends EventEmitter {
  events = events

  constructor() {
    super()
    this.events.on('event', (ev) => super.emit('event', ev))
  }

  emit(key: string, meta: Record<string, unknown>, value?: unknown): boolean
  emit(eventName: string | symbol, ...args: any[]): boolean
  emit(eventName: string | symbol, ...args: any[]): boolean {
    if (typeof eventName === 'string') {
      const key = eventName
      if (typeof args[0] === 'object') {
        const { id, ...meta } = args[0]
        const value = args[1]
        this.events.add({ ...meta, [key]: value })
      }
    }
    return super.emit(eventName, ...args)
  }
}

export const core = new Core()
