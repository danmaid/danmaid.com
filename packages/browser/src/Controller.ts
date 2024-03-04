import { Job } from './Job'

export class Controller<V = string | number> {
  map = new Map<V, V>()

  queues = new Map<V, Job[]>()
  enqueue(key: V, fn: (key: V, value?: V) => Promise<void> | void) {
    const job = new Job(() => fn(key, this.map.get(key)))
    const queue = this.queues.get(key)
    queue ? queue.push(job) : this.queues.set(key, [job])
  }

  sequentialRun(key: V) {
    this.lock(key, async () => {
      const job = this.queues.get(key)?.shift()
      await job?.exec().catch(() => undefined)
    })
  }

  lastOnlyRun(key: V) {
    this.lock(key, async () => {
      const queue = this.queues.get(key)
      const job = queue?.pop()
      queue?.splice(0)
      await job?.exec().catch(() => undefined)
    })
  }

  locks = new Set<V>()
  async lock(key: V, fn: () => Promise<void>) {
    if (this.locks.has(key)) return
    this.locks.add(key)
    await fn().catch(() => undefined)
    this.locks.delete(key)
  }

  async create(key: V, fn: () => Promise<V> | V) {
    const value = await fn()
    this.set(key, value)
  }
  async delete(key: V, fn: (value: V) => Promise<void> | void) {
    const value = this.map.get(key)
    if (value && this.map.delete(key)) await fn(value)
  }
  set(key: V, value: V) {
    this.map.set(key, value)
    this.map.set(value, key)
  }
  has(key: V) {
    return this.map.has(key)
  }
}
