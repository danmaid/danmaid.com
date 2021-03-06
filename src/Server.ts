import http from 'http'
import WebSocket from 'ws'
import { Socket } from 'net'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import path, { join, dirname } from 'path'
import fs from 'fs'
import { writeFile, mkdir, readFile, readdir } from 'fs/promises'

const dataDir = './data'

export class Server extends http.Server {
  wss = new WebSocket.Server({ server: this })
  clients: Socket[] = []
  app

  constructor() {
    super()
    fs.mkdirSync(dataDir, { recursive: true })
    const app = express()
    app.use(morgan('combined'))
    app.use(express.json())
    app.use(cors())
    app.use(express.static('./packages/web/dist'))
    app.use(
      express.static(dataDir, {
        setHeaders: (res) => res.setHeader('Content-Type', 'application/json'),
        index: false,
      })
    )
    app.get(/\/(index)?.json$/, (req, res, next) => this.onGETIndex(req, res, next))
    app.put('*', (req, res, next) => this.onPUT(req, res, next))
    app.patch('*', (req, res, next) => this.onPATCH(req, res, next))
    const indexFile = path.resolve('./packages/web/dist/index.html')
    try {
      fs.accessSync(indexFile, fs.constants.R_OK)
      app.get('*', (req, res) => res.sendFile(indexFile))
    } catch (err) {
      console.log('index.html not found.', indexFile)
    }
    this.on('request', app)
    this.on('connection', (socket) => this.clients.push(socket))
    this.app = app
  }

  onGETIndex: express.RequestHandler = async ({ query, path }, res) => {
    const dir = dirname(join(dataDir, path))
    const infos = await readdir(dir, { withFileTypes: true })
    const contents = infos
      .filter((v) => v.isFile())
      .map(async ({ name }) => {
        const data = await readFile(join(dir, name), { encoding: 'utf-8' })
        return JSON.parse(data)
      })
    const items = await Promise.all(contents)
    const objects = items.filter((v): v is Record<string, unknown> => typeof v === 'object')
    const filtered = Object.entries(query).reduce((acc, [k, v]) => {
      return acc.filter((item) => {
        const value = item[k]
        return Array.isArray(value) ? value.includes(v) : value === v
      })
    }, objects)
    res.json(filtered)
  }

  onPUT: express.RequestHandler = async ({ body, path, headers }, res, next) => {
    if (!headers['content-type']?.includes('json')) return next()
    const file = join(dataDir, path + '.json')
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, JSON.stringify(body), { encoding: 'utf-8' })
    await this.updateIndex(file)
    this.wss.clients.forEach((ws) => ws.send(JSON.stringify({ path, body })))
    res.sendStatus(200)
  }

  onPATCH: express.RequestHandler = async ({ path, body }, res) => {
    try {
      const file = join(dataDir, path + '.json')
      const data = await readFile(file, { encoding: 'utf-8' })
      const item = JSON.parse(data)
      if (!item || typeof item !== 'object') throw Error('Invalid item.')
      Object.assign(item, body)
      await writeFile(file, JSON.stringify(item), { encoding: 'utf-8' })
      await this.updateIndex(file)
      this.wss.clients.forEach((ws) => ws.send(JSON.stringify(item)))
      res.sendStatus(200)
    } catch (err) {
      res.sendStatus(404)
    }
  }

  async updateIndex(path: string) {}

  close(callback?: ((err?: Error | undefined) => void) | undefined): this {
    this.clients.forEach((v) => v.destroy())
    return super.close(callback)
  }
}
