import http from 'node:http'
import express from 'express'
import cors from 'cors'
import { MemEventStore } from './MemEventStore'
import { EventStore } from './EventStore'
import { v4 as uuid } from 'uuid'

export class Children extends Set<string> {
  static from(items: Map<string, unknown>, path: string): Children {
    const children = new Children()
    for (const k of items.keys()) {
      const child = k.slice(path.length)
      const direct = child.replace(/\/.*/, '')
      children.add(direct)
    }
    return children
  }
}

export class Items<T = Record<string, unknown>> extends Map<string, T> {
  static async from(store: EventStore, path: string): Promise<Items> {
    const events = await Events.fromPath(store, path)
    const items = new Items()
    for (const event of events) {
      const { method, path } = event
      if (typeof path !== 'string') continue
      if (method === 'DELETE') items.delete(path)
      else if (method === 'PATCH') items.set(path, { ...items.get(path), ...event })
      else if (method === 'PUT') items.set(path, event)
      else if (method === 'POST') items.set(path, event)
    }
    return items
  }
}

export class Events<T = Record<string, unknown>> extends Array<T> {
  static async fromPath(store: EventStore, path: string): Promise<Events> {
    const events = await store.filter(
      (v): v is { path: string; method?: string } =>
        v.method !== 'GET' && typeof v.path === 'string' && v.path.startsWith(path)
    )
    const revs = new Events()
    revs.push(...events)
    return revs
  }

  get last(): T | undefined {
    return this[this.length - 2]
  }
}

export class Server extends http.Server {
  store = new MemEventStore()
  origins = [
    'chrome-extension://ibndfaodijdaghpfgfomkbccnpablmki',
    'chrome-extension://hmamcnlhilpmomdgjkmeghcfcddgdkop',
  ]

  constructor() {
    const app = express()
    super(app)
    app.use(cors({ origin: this.origins }))
    app.use(express.json())
    app.use(async ({ method, path, headers, ip, ips, body }, res, next) => {
      const _id = await this.store.add({ ...headers, ip, ips, ...body, method, path })
      res.setHeader('Event-ID', _id)
      res.status(202)
      next()
    })
    app.post('*', async ({ body, path, method }, res) => {
      const id = uuid()
      const v = path.endsWith('/') ? `${path}${id}` : `${path}/${id}`
      await this.store.add({ ...body, method, path: v })
      res.status(201).json(id)
      await this.expand(body, v)
    })
    app.put('*', async ({ path, body }, res) => {
      const events = await Events.fromPath(this.store, path)
      events.length > 1 ? res.sendStatus(200) : res.sendStatus(201)
      await this.expand(body, path)
    })
    app.patch('*', async ({ body, path }, res) => {
      res.sendStatus(200)
      await this.expand(body, path)
    })
    app.delete('*', async ({ path }, res) => {
      res.sendStatus(200)
      const events = await Events.fromPath(this.store, path)
      if (events.last) await this.expand(events.last, path, 'DELETE')
    })
    app.get(/.*\/$/, async ({ path }, res) => {
      const items = await Items.from(this.store, path)
      if (items.size < 1) return res.sendStatus(404)
      res.status(200).json(Array.from(Children.from(items, path)))
    })
    app.get('*', async ({ path }, res) => {
      const items = await Items.from(this.store, path)
      const exact = items.get(path)
      exact ? res.status(200).json(exact) : res.sendStatus(404)
    })
  }

  async expand(item: Record<string, unknown>, ref: string, method = 'PUT'): Promise<void> {
    for (const [k, v] of Object.entries(item)) {
      if (typeof v !== 'string') continue
      const path = `/${k}/${encodeURIComponent(v)}/refs/${ref}`
      await this.store.add({ method, path })
    }
  }

  async start(port?: number): Promise<number> {
    await new Promise<void>((r) => this.listen(port, r))
    const addr = this.address()
    if (!addr || typeof addr !== 'object') throw Error('unsupport.')
    return addr.port
  }

  async stop(): Promise<void> {
    await new Promise((r) => this.close(r))
  }
}
