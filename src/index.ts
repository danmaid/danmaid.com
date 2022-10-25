import { Server, IncomingMessage } from 'http'
import { v4 as uuid } from 'uuid'

export class Core extends Server {
  constructor() {
    super()

    // dispatch request event
    this.on('request', (req: IncomingMessage & { id?: string; toJSON?: () => any }, res) => {
      const id = uuid()
      req.id = id
      req.toJSON = () => {
        const { socket, headers, method, url, httpVersion } = req
        const client = { address: socket.remoteAddress, family: socket.remoteFamily, port: socket.remotePort }
        const request = { client, http: httpVersion, method, url, ...headers }
        return { ...request, id, type: 'request' }
      }
      this.emit('event', req)
    })

    // timeout
    this.on('request', (req: IncomingMessage & { id: string }, res) => {
      const { id } = req
      const timeout = setTimeout(() => res.writeHead(501).end(), 3000)
      const onfinish = () => clear()
      const onevent = (ev: { request?: string }) => ev.request === id && clear()
      const clear = () => {
        clearTimeout(timeout)
        res.off('finish', onfinish)
        this.off('event', onevent)
      }
      res.on('finish', onfinish)
      this.on('event', onevent)
    })

    // SSE
    this.on('request', (req: IncomingMessage & { id: string }, res) => {
      const { method, headers, id } = req
      if (headers.accept !== 'text/event-stream') return
      if (method !== 'GET') return
      res.setHeader('Content-Type', 'text/event-stream')
      res.statusCode = 200
      this.on('event', (ev) => res.write(`data: ${JSON.stringify(ev)}\n\n`))
      this.emit('event', {
        ...res.getHeaders(),
        type: 'chunked',
        request: id,
        status: res.statusCode,
        message: res.statusMessage,
      })
    })

    // POST
    this.on('request', (req: IncomingMessage & { id: string }, res) => {
      const { method, id } = req
      if (method !== 'POST') return
      res.statusCode = 201
      res.end(id)
    })

    // GET
    this.on('request', (req, res) => {
      const { method, headers } = req
      if (headers.accept === 'text/event-stream') return
      if (method !== 'GET') return
      res.statusCode = 200
      res.end()
    })
  }
}
