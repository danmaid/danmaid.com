import { EventStore } from './EventStore'

export class MemEventStore<T = Record<string, unknown>> implements EventStore<T> {
  events: T[] = []
  async add(event: T): Promise<string> {
    const _id = new Date().toISOString()
    this.events.push({ ...event, _id })
    return _id
  }

  async filter<S extends T>(fn: (event: T) => event is S): Promise<S[]>
  async filter(fn: (event: T) => boolean): Promise<T[]>
  async filter(fn: (event: T) => boolean): Promise<T[]> {
    return this.events.filter(fn)
  }
}
