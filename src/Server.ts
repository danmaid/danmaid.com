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
  items: Item[] = []
  clients: Socket[] = []
  app

  constructor() {
    super()
    const app = express()
    app.use(morgan('combined'))
    app.use(express.json())
    app.use(cors())
    app.use(express.static('./packages/web/dist'))
    app.get('*.json', (req, res) => this.onGET(req, res))
    app.put('*', (req, res) => this.onPUT(req, res))
    app.patch('/:id', (req, res) => this.onPATCH(req, res))
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

  async onPUT({ body }: express.Request, res: express.Response) {
    this.items.push(body)
    this.wss.clients.forEach((ws) => ws.send(JSON.stringify(body)))
    res.sendStatus(200)
  }

  async onGET({ query }: express.Request, res: express.Response) {
    const links = query.links
    const items = typeof links === 'string' ? this.items.filter((v) => v.links?.includes(links)) : this.items
    res.json(items)
  }

  async onPATCH({ params, body }: express.Request<{ id: string }>, res: express.Response) {
    const item = this.items.find((v) => v.id === params.id)
    if (!item) return res.sendStatus(404)
    Object.assign(item, body)
    this.wss.clients.forEach((ws) => ws.send(JSON.stringify(item)))
    res.sendStatus(200)
  }

  close(callback?: ((err?: Error | undefined) => void) | undefined): this {
    this.clients.forEach((v) => v.destroy())
    return super.close(callback)
  }
}
