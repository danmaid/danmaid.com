import { Server } from './Server'
import { createServer } from 'vite'

export class DevServer extends Server {
  vite = createServer({
    root: 'packages/web',
    server: { middlewareMode: 'html' },
  })

  constructor() {
    super()
    this.vite.then((vite) => this.app.use(vite.middlewares))
  }

  close(callback?: ((err?: Error | undefined) => void) | undefined): this {
    this.vite.then(async (vite) => {
      await vite.close()
      super.close(callback)
    })
    return this
  }
}
