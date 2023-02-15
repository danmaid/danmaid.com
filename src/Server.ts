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
  toJSON = () => Object.fromEntries(Array.from(this).map((v) => [v, {}]))
}

export class Items<T = Record<string, unknown>> extends Map<string, T> {
  static async from(store: EventStore, path: string): Promise<Items> {
    const events = await store.filter(
      (v): v is { path: string; method?: string } =>
        v.method !== 'GET' && typeof v.path === 'string' && v.path.startsWith(path)
    )
    const items = new Items()
    for (const event of events) {
      if (event.method === 'DELETE') items.delete(event.path)
      else if (event.method === 'PATCH') items.set(event.path, { ...items.get(event.path), ...event })
      else if (event.method === 'PUT') items.set(event.path, event)
      else if (event.method === 'POST') items.set(event.path, event)
    }
    return items
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
    app.post('*', async ({ body, path, method }, res, next) => {
      const id = uuid()
      const v = path.endsWith('/') ? `${path}${id}` : `${path}/${id}`
      await this.store.add({ ...body, method, path: v })
      res.status(201).json(id)
      next()
    })
    app.put('*', async (req, res, next) => {
      res.sendStatus(200)
      next()
    })
    app.patch('*', async (req, res, next) => {
      res.sendStatus(200)
      next()
    })
    app.use(async ({ body, method }, res, next) => {
      if (!['POST', 'PUT', 'PATCH'].includes(method)) return next()
      for (const [k, v] of Object.entries(body)) {
        if (typeof v !== 'string') continue
        const path = `/${k}/${encodeURIComponent(v)}`
        await this.store.add({ method: 'PUT', path })
      }
    })
    app.delete('*', async (req, res) => res.sendStatus(200))
    app.get(/.*\/$/, async ({ path }, res) => {
      const items = await Items.from(this.store, path)
      if (items.size < 1) return res.sendStatus(404)
      res.status(200).json(Array.from(Children.from(items, path)))
    })
    app.get('*', async ({ path }, res) => {
      const items = await Items.from(this.store, path)
      if (items.size < 1) return res.sendStatus(404)
      const exact = items.get(path)
      if (exact) return res.status(200).json(exact)
      res.status(200).json(Children.from(items, path + '/'))
    })
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
