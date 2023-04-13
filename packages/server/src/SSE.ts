import { RequestHandler, Response } from 'express'

export class SSE {
  clients = new Set<Response>()

  getClient(req: Response): string {
    return `${req.socket?.remoteAddress || ''}:${req.socket?.remotePort || ''}`
  }

  broadcast(data: string, options?: { id?: string; event?: string; retry?: number }) {
    console.log(`broadcast. ${data}`, options)
    for (const client of this.clients) {
      if (options?.retry) client.write(`retry: ${options.retry}\n`)
      if (options?.event) client.write(`event: ${options.event}\n`)
      client.write(`data: ${data}\n`)
      if (options?.id) client.write(`id: ${options.id}\n`)
      client.write('\n')
      console.log(`sent. ${this.getClient(client)}`)
    }
  }

  middleware: RequestHandler = (req, res, next) => {
    if (!req.accepts().includes('text/event-stream')) return next()
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Type', 'text/event-stream')
    res.once('close', () => console.log(`SSE closed. ${this.getClient(res)}`))
    res.flushHeaders()
    this.clients.add(res)
    console.log(`SSE started. ${this.getClient(res)}`)
  }
}
