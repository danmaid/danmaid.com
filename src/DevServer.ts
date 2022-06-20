import { IncomingMessage, ServerResponse } from 'http'
import { Server } from './Server'
import { createServer } from 'vite'
import express from 'express'

export class DevServer extends Server {
  app = express()
  vite = createServer({
    root: 'packages/web',
    server: { middlewareMode: 'html' },
  })

  constructor() {
    super()
    this.vite.then((vite) => this.app.use(vite.middlewares))
  }

  async onrequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    await super.onrequest(req, res)
    if (res.headersSent) return
    await this.vite
    this.app(req, res)
  }

  close(callback?: ((err?: Error | undefined) => void) | undefined): this {
    this.vite.then(async (vite) => {
      await vite.close()
      super.close(callback)
    })
    return this
  }
}
