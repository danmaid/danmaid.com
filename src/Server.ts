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
import { appendFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'

const console = { log: debuglog('server') }

type Meta = { id: string; type?: string }

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
    app.post('/', async (req, res) => {
      const id = uuid()
      const type = req.get('Content-Type')
      const meta: Meta = { id, type }
      // store body
      await new Promise((resolve, reject) => {
        const output = createWriteStream(join(this.dataDir, id))
        output.on('finish', resolve)
        output.on('error', reject)
        req.pipe(output)
      })
      // store index
      appendFile(index, JSON.stringify(meta) + '\n')
      this.core.emit('added', meta)
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
