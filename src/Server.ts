import http from 'node:http'
import express from 'express'
import cors from 'cors'
import { mkdirSync, readFileSync, writeFileSync, accessSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'

export class Server extends http.Server {
  dir = './data'
  origins = [
    'chrome-extension://ibndfaodijdaghpfgfomkbccnpablmki',
    'chrome-extension://hmamcnlhilpmomdgjkmeghcfcddgdkop',
  ]

  constructor(public app = express(), options?: { dir?: string }) {
    super(app)
    Object.assign(this, options)
    mkdirSync(this.dir, { recursive: true })
    app.use(cors({ origin: this.origins }))
    app.use(express.static(this.dir, { extensions: ['json'], index: ['index.json'] }))
    app.use(express.json())
    app.put('*', async ({ body, path }, res, next) => {
      // data
      const file = join(this.dir, path + '.json')
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, JSON.stringify(body), { encoding: 'utf-8' })
      // index
      let index: string[]
      const indexPath = join(dirname(file), 'index.json')
      try {
        const f = readFileSync(indexPath, { encoding: 'utf-8' })
        index = JSON.parse(f)
      } catch {
        index = []
      }
      if (!index.includes(basename(path))) {
        index.push(basename(path))
        writeFileSync(indexPath, JSON.stringify(index), { encoding: 'utf-8' })
      }
      // KV expand
      for (const [k, v] of Object.entries(body)) {
        if (typeof v === 'string') {
          // index
          let cindex: string[]
          mkdirSync(join(this.dir, k), { recursive: true })
          const cindexPath = join(this.dir, k, 'index.json')
          try {
            const f = readFileSync(cindexPath, { encoding: 'utf-8' })
            cindex = JSON.parse(f)
          } catch {
            cindex = []
            if (!index.includes(k)) {
              index.push(k)
              writeFileSync(indexPath, JSON.stringify(index), { encoding: 'utf-8' })
            }
          }
          if (!cindex.includes(v)) {
            cindex.push(v)
            writeFileSync(cindexPath, JSON.stringify(cindex), { encoding: 'utf-8' })
          }
          // data
          const dataPath = join(this.dir, k, `${v}.json`)
          try {
            accessSync(dataPath)
          } catch {
            writeFileSync(dataPath, JSON.stringify({}), { encoding: 'utf-8' })
          }
        }
      }
      res.sendStatus(200)
    })
  }

  async start(port?: number): Promise<number> {
    await new Promise<void>((r) => this.listen(port, r))
    const addr = this.address()
    if (!addr || typeof addr !== 'object') throw Error('unsupport.')
    return addr.port
  }

  async stop(): Promise<void> {
    await new Promise((r) => this.close(r))
  }
}
