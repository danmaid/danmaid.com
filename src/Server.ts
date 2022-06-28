import http from 'http'
import WebSocket from 'ws'
import { Socket } from 'net'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import path from 'path'
import fs from 'fs'

interface Item {
  id?: string
  links?: string[]
}

export class Server extends http.Server {
  wss = new WebSocket.Server({ server: this })
  items = new Map<string, unknown>()
  clients: Socket[] = []
  app

  constructor() {
    super()
    const app = express()
    app.use(morgan('combined'))
    app.use(express.json())
    app.use(cors())
    app.use(express.static('./packages/web/dist'))
    app.get(/\/(index)?.json$/, (req, res, next) => this.onGETIndex(req, res, next))
    app.get('*.json', (req, res, next) => this.onGET(req, res, next))
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

  onPUT: express.RequestHandler = async ({ body, path }, res) => {
    this.items.set(path, body)
    this.wss.clients.forEach((ws) => ws.send(JSON.stringify({ path, body })))
    res.sendStatus(200)
  }

  onGETIndex: express.RequestHandler = async ({ query, path }, res) => {
    const items = Array.from(this.items)
      .filter(([k]) => k.startsWith(path.replace(/(index)?\.json$/, '')))
      .map(([, v]) => v)
    if (Object.keys(query).length < 1) return res.json(items)

    const objects = items.filter((v): v is Record<string, unknown> => typeof v === 'object')
    const filtered = Object.entries(query).reduce((acc, [k, v]) => {
      return acc.filter((item) => {
        const value = item[k]
        return Array.isArray(value) ? value.includes(v) : value === v
      })
    }, objects)
    res.json(filtered)
  }

  onGET: express.RequestHandler = async ({ path }, res) => {
    const item = this.items.get(path.replace(/(index)?\.json$/, ''))
    item !== undefined ? res.json(item) : res.sendStatus(404)
  }

  onPATCH: express.RequestHandler = async ({ path, body }, res) => {
    const item = this.items.get(path)
    if (!item || typeof item !== 'object') return res.sendStatus(404)
    Object.assign(item, body)
    this.wss.clients.forEach((ws) => ws.send(JSON.stringify(item)))
    res.sendStatus(200)
  }

  close(callback?: ((err?: Error | undefined) => void) | undefined): this {
    this.clients.forEach((v) => v.destroy())
    return super.close(callback)
  }
}
