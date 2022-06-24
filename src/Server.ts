import http from 'http'
import WebSocket from 'ws'
import { Socket } from 'net'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'

export class Server extends http.Server {
  wss = new WebSocket.Server({ server: this })
  events: { links?: string[] }[] = []
  clients: Socket[] = []
  app

  constructor() {
    super()
    const app = express()
    app.use(morgan('combined'))
    app.use(express.json())
    app.use(cors())
    app.use(express.static('./packages/web/dist'))
    app.route('*').put((req, res) => this.onPUT(req, res))
    app.get('*.json', (req, res) => this.onGET(req, res))
    this.on('request', app)
    this.on('connection', (socket) => this.clients.push(socket))
    this.app = app
  }

  async onPUT({ body }: express.Request, res: express.Response) {
    this.events.push(body)
    this.wss.clients.forEach((ws) => ws.send(JSON.stringify(body)))
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.sendStatus(200)
  }

  async onGET({ query }: express.Request, res: express.Response) {
    const links = query.links
    const events = typeof links === 'string' ? this.events.filter((v) => v.links?.includes(links)) : this.events
    res.json(events)
  }

  close(callback?: ((err?: Error | undefined) => void) | undefined): this {
    this.clients.forEach((v) => v.destroy())
    return super.close(callback)
  }
}
