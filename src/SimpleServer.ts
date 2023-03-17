import { IncomingHttpHeaders, Server } from 'node:http'
import { randomUUID } from 'node:crypto'
import { appendFile } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { on } from 'node:events'
import express from 'express'
import cors from 'cors'
import { Socket } from 'node:net'

interface HttpEvent {
  method: string
  path: string
  http: string
  headers: IncomingHttpHeaders
  body: unknown
  event: { id: string; date: Date }
}

interface ContentEvent extends HttpEvent {
  method: 'PUT' | 'DELETE'
}

export class SimpleServer extends Server {
  origin = [
    'chrome-extension://ibndfaodijdaghpfgfomkbccnpablmki',
    'chrome-extension://hmamcnlhilpmomdgjkmeghcfcddgdkop',
  ]
  file = './data/events.jsonl'
  clients = new Set<Socket>()

  constructor() {
    const app = express()
    super(app)
    this.on('connection', (socket) => {
      this.clients.add(socket)
      socket.on('close', () => this.clients.delete(socket))
    })
    app.use(cors({ origin: this.origin }))
    app.use(express.json())
    app.use((req, res, next) => this.saveEvent(req).then(next))
    app.get('*', (req, res, next) => this.handleSSE(req, res, next))
    app.post('*', (req, res, next) => this.onPOST(req, res, next))
    app.get(/[^/]$/, (req, res, next) => this.onGETdetail(req, res, next))
    app.get(/\/$/, (req, res, next) => this.onGETindex(req, res, next))
    app.put('*', (req, res) => res.sendStatus(200))
    app.delete('*', (req, res) => res.sendStatus(200))
  }

  async saveEvent(req: Pick<express.Request, 'method' | 'path' | 'httpVersion' | 'headers' | 'body'>): Promise<void> {
    const { method, path, httpVersion: http, headers, body } = req
    const event = { id: randomUUID(), date: new Date() }
    const data: HttpEvent = { method, path, http, headers, body, event }
    await appendFile(this.file, JSON.stringify(data) + '\n')
    this.emit('event', data)
  }

  handleSSE: express.RequestHandler = async (req, res, next) => {
    if (!req.accepts().includes('text/event-stream')) return next()
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Type', 'text/event-stream')
    res.flushHeaders()
    const ac = new AbortController()
    res.once('close', () => ac.abort())
    try {
      for await (const ev of this.onEvent({ signal: ac.signal })) {
        if (!ev.path.startsWith(req.path)) continue
        res.write(`data: ${JSON.stringify(ev)}\n`)
        res.write(`id: ${ev.event.id}\n\n`)
      }
    } catch {}
  }

  async *onEvent(options?: Parameters<typeof on>[2]): AsyncGenerator<HttpEvent> {
    for await (const ev of on(this, 'event', options)) yield ev
  }

  onGETindex: express.RequestHandler = async ({ path }, res) => {
    const map = new Map()
    for await (const ev of this.getContentEvents()) {
      const matched = new RegExp((path.endsWith('/') ? '' : '/') + '([^/]+)').exec(ev.path)
      if (!matched) continue
      const [_, id] = matched
      ev.method === 'PUT' ? map.set(id, ev) : map.delete(id)
    }
    res.status(200).json(Array.from(map.entries()).map(([id, v]) => ({ ...v.body, id })))
  }

  onGETdetail: express.RequestHandler = async ({ path }, res) => {
    let data
    for await (const ev of this.getContentEvents()) {
      if (ev.path !== path) continue
      data = ev.method === 'PUT' ? ev.body : undefined
    }
    if (data) res.status(200).json(data)
    else res.sendStatus(404)
  }

  isContentEvent(ev: HttpEvent): ev is ContentEvent {
    if (ev.method === 'PUT') return true
    if (ev.method === 'DELETE') return true
    return false
  }

  async *getContentEvents(): AsyncGenerator<ContentEvent> {
    for await (const line of createInterface(createReadStream(this.file))) {
      const ev: HttpEvent = JSON.parse(line)
      if (!this.isContentEvent(ev)) continue
      yield ev
    }
  }

  // POST => PUT
  onPOST: express.RequestHandler = async (req, res) => {
    const id = randomUUID()
    await this.saveEvent({ ...req, method: 'PUT', path: req.path.endsWith('/') ? req.path + id : `${req.path}/${id}` })
    res.status(201).json(id)
  }

  async start(port?: number): Promise<number> {
    await new Promise<void>((r) => this.listen(port, r))
    const addr = this.address()
    if (!addr || typeof addr !== 'object') throw Error('unsupport.')
    return addr.port
  }

  async stop(): Promise<void> {
    for (const client of this.clients) client.destroy()
    await new Promise((r) => this.close(r))
  }
}
