import http from 'http'
import express from 'express'
import morgan from 'morgan'
import path, { join } from 'path'
import fs from 'fs'
import { DataStore } from './DataStore'
import { ConnectionManager } from './ConnectionManager'
import SSE from './SSE'
import { Core } from './Core'
import { debuglog } from 'node:util'
import { v4 as uuid } from 'uuid'
import { createWriteStream, mkdirSync, createReadStream, accessSync, constants, openSync, closeSync } from 'node:fs'
import { appendFile, writeFile, readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { LimitedArray } from './LimitedArray'

const console = { log: debuglog('server'), debug: debuglog('server') }

type Meta = { id: string; type?: string; event?: 'added' }

export class Server extends http.Server {
  app: express.Express
  cm = new ConnectionManager(this)
  ds = new DataStore()
  core = new Core()
  dataDir = './data'

  constructor() {
    super()
    mkdirSync(this.dataDir, { recursive: true })
    const index = join(this.dataDir, 'index.jsonl')
    try {
      accessSync(index, constants.R_OK)
    } catch {
      closeSync(openSync(index, 'w'))
    }

    const serveStatic = express.static(this.dataDir)
    const fallback = path.resolve('./packages/web/dist/index.html')

    const app = express()
    app.use(morgan('combined'))
    app.use((req, res, next) => {
      // Accept ヘッダーを q=1 に限定
      req.headers.accept = req.headers.accept
        ?.split(',')
        .filter((v) => !/;q=0/.test(v))
        .join(',')
      next()
    })
    app.use((req, res, next) => (this.isSSE(req) ? SSE(this.core)(req, res, next) : next()))
    app.use(express.static('./packages/web/dist'))
    app.get('/:id', async (req, res, next) => {
      // search index
      try {
        const meta = await new Promise<Meta>((resolve, reject) => {
          const input = createInterface({ input: createReadStream(index) })
          input.on('line', (line) => {
            const meta: Meta = JSON.parse(line)
            if (meta.id === req.params.id) {
              resolve(meta)
              input.close()
            }
          })
          input.on('close', reject)
        })
        console.log(JSON.stringify(meta))
        const type = meta.type || express.static.mime.lookup(join(this.dataDir, meta.id))
        if (!req.accepts(type)) next()
        res.set('Content-Type', type)
        serveStatic(req, res, next)
      } catch {
        console.log('index not found.', req.params.id)
        next()
      }
    })
    app.get('/', async (req, res, next) => {
      if (req.accepts('json')) {
        // send index
        const list = await new Promise<Meta[]>((resolve, reject) => {
          const list: Meta[] = []
          const input = createInterface({ input: createReadStream(index) })
          input.on('line', (line) => list.push(JSON.parse(line)))
          input.on('close', () => resolve(list))
        })
        res.json(list)
      } else next()
    })
    // store body
    const store = (id: string, req: express.Request) =>
      new Promise((resolve, reject) => {
        const output = createWriteStream(join(this.dataDir, id))
        output.on('finish', resolve)
        output.on('error', reject)
        req.pipe(output)
      })

    app.post('/', async (req, res) => {
      const id = uuid()
      const type = req.get('Content-Type')
      // vnd.danmaid+json は必ずオブジェクト (いきなり array とかは来ない)
      if (req.get('Content-Type') === 'application/vnd.danmaid+json') {
        const body = await new Promise<Record<string, unknown>>((resolve, reject) => {
          let data: string
          req.on('data', (chunk) => (data += chunk))
          req.on('end', () => {
            try {
              resolve(JSON.parse(data))
            } catch (err) {
              reject(err)
            }
          })
        })
        this.core.emit({ id, type, ...body })
      }
      await store(id, req)
      this.core.emit({ event: 'stored', id, type })
      res.json(id)
    })
    app.post('/:resource', async (req, res) => {
      const id = uuid()
      const type = req.get('Content-Type')
      await store(id, req)
      const meta: Record<string, unknown> = { event: 'stored', id, type }
      if (req.params.resource === 'todos') meta.tags = ['todo']
      this.core.emit(meta)
      res.json(id)
    })
    try {
      fs.accessSync(fallback, fs.constants.R_OK)
      app.get('*', (req, res) => res.sendFile(fallback))
    } catch (err) {
      console.log('fallback not found.', fallback)
    }
    this.on('request', app)
    this.app = app
    // global index
    this.core.on(
      (ev) => ev.event === 'stored',
      (ev) => appendFile(index, JSON.stringify(ev) + '\n')
    )
    // timeline
    const timeline: unknown[] = new LimitedArray()
    const timelineIndex = join(this.dataDir, 'timeline.json')
    this.core.on(
      () => true,
      async (meta: Meta) => {
        const date = new Date()
        const line =
          meta.type === 'application/json'
            ? { date, ...meta, ...JSON.parse(await readFile(join(this.dataDir, meta.id), { encoding: 'utf-8' })) }
            : { date, ...meta }
        timeline.push(line)
        await writeFile(timelineIndex, JSON.stringify(timeline))
        // this.core.emit(line)
      }
    )
    new Promise<void>((resolve, reject) => {
      const idx = createInterface({ input: createReadStream(index) })
      idx.on('line', (line) => JSON.parse(line).id === 'timeline.json' && resolve())
      idx.on('close', reject)
    }).catch(() => {
      console.log('timeline.json index not found. to make it.')
      appendFile(index, JSON.stringify({ id: 'timeline.json', type: 'application/json' }) + '\n')
    })
    // todos
    this.core.on(
      (ev) => ev.event === 'stored' && Array.isArray(ev.tags) && ev.tags.includes('todo'),
      async (meta: Meta) => {
        console.debug('todo', meta)
        if (meta.type !== 'application/json') return
        const data = JSON.parse(await readFile(join(this.dataDir, meta.id), { encoding: 'utf-8' }))
        const todos = JSON.parse(await readFile(join(this.dataDir, 'todos.json'), { encoding: 'utf-8' }))
        todos.push(data)
        await writeFile(join(this.dataDir, 'todos.json'), JSON.stringify(todos))
        this.core.emit({ channel: 'todo', event: 'added' })
      }
    )
  }

  isSSE(req: express.Request): boolean {
    return req.accepts().includes('text/event-stream')
  }

  isAccept(req: express.Request): boolean {
    const mediaType = express.static.mime.lookup(join(this.dataDir, req.path))
    console.log(mediaType)
    return !!req.accepts(mediaType)
  }
}
