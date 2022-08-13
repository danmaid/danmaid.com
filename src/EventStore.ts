import { EventEmitter } from 'events'
import { v4 as uuid } from 'uuid'

export interface Request {
  id: string
  url: string
  method: string
  headers: Record<string, string>
}

export interface Events {
  request: (req: Request) => void
}

export interface EventStore {
  on(eventName: 'request', listener: (req: Request) => void): this
  emit(eventName: 'request', req: Request): boolean
}

export class EventStore extends EventEmitter {
  index = []

  emit(eventName: string | symbol, ...args: any[]): boolean {
    const id = uuid()
    this.index.push(id)
  }
}
