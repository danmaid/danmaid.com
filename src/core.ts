import { v4 as uuid } from 'uuid'

export function isObject(v: any): v is Record<string, unknown> {
  if (v == null) return false
  if (typeof v !== 'object') return false
  return true
}

export interface Event {
  id: string
  date: Date
  type?: string
}
export function isEvent(v: any): v is Event {
  if (!isObject(v)) return false
  if (typeof v.id !== 'string') return false
  if (!(v.date instanceof Date)) return false
  if (v.type && typeof v.type !== 'string') return false
  return true
}
export type Resolver<T extends Event = Event> = (event: Partial<T>) => boolean
export type Listener<T extends Event = Event> = (event: T) => void | Promise<Partial<Event> | void>

export function resolveAll(v: any): v is object {
  if (v == null) return false
  if (typeof v !== 'object') return false
  return true
}

export class Core {
  listeners: [Resolver, Listener][] = []

  emit<T>(ev: T): void {
    const id = uuid()
    const date = new Date()
    const event = { id, date, ...ev }
    this.listeners
      .filter(([resolver]) => resolver(event))
      .forEach(async ([_, listener]) => {
        const ev = await listener(event)
        if (ev) this.emit(ev)
      })
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

// export const core = new Core()
