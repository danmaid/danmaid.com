import http from 'http'
import WebSocket from 'ws'
import { Socket } from 'net'

export class Server extends http.Server {
  wss = new WebSocket.Server({ server: this })
  events: unknown[] = []
  clients: Socket[] = []

  constructor() {
    super()
    this.on('request', this.onrequest)
    this.on('connection', (socket) => this.clients.push(socket))
  }

  async onrequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const body: string = await new Promise((resolve) => {
      let data = ''
      req.on('data', (chunk) => (data += chunk))
      req.on('end', () => resolve(data))
    })
    if (req.method === 'PUT') {
      this.events.push(JSON.parse(body))
      this.wss.clients.forEach((ws) => ws.send(body))
      res.writeHead(200).end()
      return
    }
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(this.events))
      return
    }
  }

  close(callback?: ((err?: Error | undefined) => void) | undefined): this {
    this.clients.forEach((v) => v.destroy())
    return super.close(callback)
  }
}
