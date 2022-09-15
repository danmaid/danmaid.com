import { Router } from 'express'
import { DataStore } from './DataStore'
import { resolve, join, parse } from 'node:path'
import { access, link, unlink, appendFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { createReadStream, constants } from 'node:fs'
import { Core } from './Core'
import cors from 'cors'

export default function (ds: DataStore, core: Core): Router {
  const dataDir = resolve('./data')

  return Router()
    .get('*', async (req, res, next) => {
      // index
      const index = join(dataDir, req.path, 'index.jsonl')
      try {
        await access(index, constants.R_OK)
      } catch {
        return next()
      }
      if (req.accepts('json')) {
        try {
          const rl = createInterface({ input: createReadStream(index) })
          const items: unknown[] = []
          rl.on('line', (line) => items.push(JSON.parse(line)))
          rl.once('close', () => res.json(items))
        } catch (err) {
          return res.sendStatus(500)
        }
      } else next()
    })
    .use(cors())
    .put('*', async (req, res, next) => {
      const id = await ds.add(req)
      const src = ds.resolve(id)
      const dest = resolve(join(dataDir, req.path))
      await unlink(dest).catch(() => {})
      await link(src, dest)
      const { dir, base } = parse(dest)
      const meta = { id, name: base, type: req.headers['content-type'] }
      await appendFile(join(dir, 'index.jsonl'), JSON.stringify(meta) + '\n')
      core.emit('stored', meta)
      res.sendStatus(200)
    })
}
