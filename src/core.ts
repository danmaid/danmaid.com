import { v4 as uuid } from 'uuid'

export interface Event {
  id: string
  date: Date
  type?: string
}
export type Resolver<T extends Event = Event> = (event: Partial<T>) => boolean
export type Listener<T extends Event = Event> = (event: T) => void

export function resolveAll(): boolean {
  return true
}

export class Core {
  listeners: [Resolver, Listener][] = []

  emit<T extends Event>(ev: Omit<T, 'id' | 'date'> | Omit<T, 'id'>): void {
    const id = uuid()
    const date = new Date()
    const event = { id, date, ...ev }
    this.listeners.filter(([r]) => r(event)).forEach(([_, l]) => l(event))
  }

  on<T extends Event>(resolver: Resolver<T>, listener: Listener<T>): void
  on(resolver: Resolver, listener: Listener): void {
    this.listeners.push([resolver, listener])
  }

  off<T extends Event>(resolver: Resolver<T>, listner: Listener<T>): void
  off(resolver: Resolver, listner: Listener): void {
    const i = this.listeners.findIndex(([r, l]) => r === resolver && l === listner)
    if (i >= 0) this.listeners.splice(i, 1)
  }

  wait<T extends Event>(resolver: Resolver<T>): Promise<T> {
    return new Promise((resolve) => {
      const listener = (ev: T) => {
        this.off(resolver, listener)
        resolve(ev)
      }
      this.on(resolver, listener)
    })
  }
}

export const core = new Core()
