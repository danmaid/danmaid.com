import http from 'http'
import WebSocket from 'ws'
import { Socket } from 'net'

export class Server extends http.Server {
  wss = new WebSocket.Server({ server: this })
  events: { links?: string[] }[] = []
  clients: Socket[] = []

  constructor() {
    super()
    this.on('request', this.onrequest)
    this.on('connection', (socket) => this.clients.push(socket))
  }

  async onrequest(req: http.IncomingMessage, res: http.ServerResponse) {
    console.log(req.url)
    const body: string = await new Promise((resolve) => {
      let data = ''
      req.on('data', (chunk) => (data += chunk))
      req.on('end', () => resolve(data))
    })
    if (req.method === 'PUT') {
      this.events.push(JSON.parse(body))
      this.wss.clients.forEach((ws) => ws.send(body))
      res.writeHead(200, { 'Access-Control-Allow-Origin': '*' }).end()
      return
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
      })
      res.end()
      return
    }
    if (!req.url) return
    const url = new URL(req.url, 'http://localhost')
    if (req.method === 'GET' && url.pathname.endsWith('.json')) {
      const links = url.searchParams.get('links')
      const events = links ? this.events.filter((v) => v.links?.includes(links)) : this.events
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(events))
      return
    }
  }

  close(callback?: ((err?: Error | undefined) => void) | undefined): this {
    this.clients.forEach((v) => v.destroy())
    return super.close(callback)
  }
}
