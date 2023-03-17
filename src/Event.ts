import { randomUUID } from 'node:crypto'
import { appendFile } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

export class Event implements Record<string, unknown> {
  [x: string]: unknown
  id = randomUUID()
  date = new Date()

  constructor(init: Record<string, unknown>) {
    this.set(init)
  }

  set(value: Record<string, unknown>): this {
    return Object.assign(this, value)
  }
}

const file = './data/events.jsonl'

export async function addEvent(e: Event): Promise<void> {
  await appendFile(file, JSON.stringify(e) + '\n')
}

export async function* filterEvents(filter: (v: Event) => boolean): AsyncGenerator<Event> {
  const reader = createInterface(createReadStream(file))
  for await (const line of reader) {
    const event = JSON.parse(line)
    if (filter(event)) yield event
  }
}

export class Cache<T> extends Set<T> {
  maxSize = 10000

  constructor(options?: { maxSize?: number }) {
    super()
    if (options?.maxSize) this.maxSize = options.maxSize
  }

  add(value: T): this {
    while (this.size >= this.maxSize) this.shift()
    return super.add(value)
  }

  shift(): T | undefined {
    let t
    for (const e of this) {
      t = e
      this.delete(e)
      break
    }
    return t
  }
}
