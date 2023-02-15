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
    const x = await store.filter(
      (v): v is { path: string } => v.method === 'PUT' && typeof v.path === 'string' && v.path.startsWith(path)
    )
    return new Items(x.map((v) => [v.path, v]))
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
    app.post('*', async ({ body, path }, res) => {
      const id = uuid()
      const v = path.endsWith('/') ? `${path}${id}` : `${path}/${id}`
      await this.store.add({ ...body, method: 'PUT', path: v })
      res.status(201).json(id)
    })
    app.put('*', async (req, res) => {
      const { method, path, headers, ip, ips, body } = req
      for (const [k, v] of Object.entries(body)) {
        if (typeof v !== 'string') continue
        const path = `/${k}/${encodeURIComponent(v)}`
        await this.store.add({ ...headers, ip, ips, method, path })
      }
      res.sendStatus(200)
    })
    app.get('*', async ({ path }, res) => {
      const items = await Items.from(this.store, path)
      if (items.size < 1) return res.sendStatus(404)
      const exact = items.get(path)
      if (exact) return res.status(200).json(exact)
      path.endsWith('/')
        ? res.status(200).json(Array.from(Children.from(items, path)))
        : res.status(200).json(Children.from(items, path + '/'))
    })
    // app.put('*', async ({ body, path }, res, next) => {
    //   // data
    //   const file = join(this.dir, path + '.json')
    //   mkdirSync(dirname(file), { recursive: true })
    //   writeFileSync(file, JSON.stringify(body), { encoding: 'utf-8' })
    //   // index
    //   let index: string[]
    //   const indexPath = join(dirname(file), 'index.json')
    //   try {
    //     const f = readFileSync(indexPath, { encoding: 'utf-8' })
    //     index = JSON.parse(f)
    //   } catch {
    //     index = []
    //   }
    //   if (!index.includes(basename(path))) {
    //     index.push(basename(path))
    //     writeFileSync(indexPath, JSON.stringify(index), { encoding: 'utf-8' })
    //   }
    //   // KV expand
    //   for (const [k, v] of Object.entries(body)) {
    //     if (typeof v === 'string') {
    //       // index
    //       let cindex: string[]
    //       mkdirSync(join(this.dir, k), { recursive: true })
    //       const cindexPath = join(this.dir, k, 'index.json')
    //       try {
    //         const f = readFileSync(cindexPath, { encoding: 'utf-8' })
    //         cindex = JSON.parse(f)
    //       } catch {
    //         cindex = []
    //         if (!index.includes(k)) {
    //           index.push(k)
    //           writeFileSync(indexPath, JSON.stringify(index), { encoding: 'utf-8' })
    //         }
    //       }
    //       if (!cindex.includes(v)) {
    //         cindex.push(v)
    //         writeFileSync(cindexPath, JSON.stringify(cindex), { encoding: 'utf-8' })
    //       }
    //       // data
    //       const dataPath = join(this.dir, k, `${v}.json`)
    //       try {
    //         accessSync(dataPath)
    //       } catch {
    //         writeFileSync(dataPath, JSON.stringify({}), { encoding: 'utf-8' })
    //       }
    //     }
    //   }
    //   res.sendStatus(200)
    // })
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
