import http from 'node:http'
import express from 'express'
import { todos } from './todos'
import { sensors } from './sensors'
import { sse } from './sse'
import { events } from './events'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { createReadStream } from 'node:fs'
import { addIndex, getIndex, removeIndex, updateIndex } from './resource'

const dir = './data'

export const sequencer = new Map<string, Promise<any>>()

export class Server extends http.Server {
  constructor(public app = express()) {
    super(app)
    app.use(async (req, res, next) => {
      const { method, path, headers } = req
      const event = await events.add({ ...headers, method, path }, req)
      res.setHeader('Event-ID', event.id)
      res.setHeader('Event-Date', event.date.toISOString())
      res.locals.event = event
      next()
    })
    app.use(sse)
    app.use(todos)
    app.use(sensors)
    app.post('*', async ({ path, headers }, res, next) => {
      try {
        const { id, event } = res.locals.event
        await mkdir(join(dir, path), { recursive: true })
        await events.copyContent(id, join(dir, path, id), headers['content-type'])
        const data = headers['content-type'] === 'application/json' ? await events.getJsonContent(id) : {}
        await addIndex(join(dir, path, 'index.json'), id, { ...event, ...data })
        events.add({ ...event, ...data, id, type: 'created' })
        res.status(201).json(id)
      } catch {
        next()
      }
    })
    app.get(':parent(*)/:id', async ({ path, params: { parent, id } }, res, next) => {
      try {
        const index = await getIndex<{ 'content-type'?: string }>(join(dir, parent, 'index.json'), id)
        res.set({ 'content-type': index['content-type'] })
        createReadStream(join(dir, path)).pipe(res)
      } catch {
        next()
      }
    })
    app.get('*', async ({ path, query }, res, next) => {
      try {
        const text = await readFile(join(dir, path, 'index.json'), 'utf-8')
        const data: Record<string, unknown>[] = JSON.parse(text)
        if (Object.keys(query).length > 0) {
          const filtered = data.filter((item) => {
            return Object.entries(query).every(([k, v]) => {
              return typeof v === 'string' && v.startsWith('!') ? item[k] !== v.slice(1) : item[k] === v
            })
          })
          res.json(filtered)
        } else {
          res.json(data)
        }
      } catch {
        next()
      }
    })
    app.delete(':parent(*)/:id', async ({ path, params: { parent, id } }, res, next) => {
      try {
        const { event } = res.locals.event
        await rm(join(dir, path))
        await removeIndex(join(dir, parent, 'index.json'), id)
        events.add({ ...event, id, type: 'deleted' })
        res.sendStatus(200)
      } catch {
        next()
      }
    })
    app.patch(':parent(*)/:id', async ({ path, params: { parent, id }, headers }, res, next) => {
      try {
        if (headers['content-type'] !== 'application/json') return next()
        const { id: eventId, event } = res.locals.event
        const before = JSON.parse(await readFile(join(dir, path), 'utf-8'))
        const patch = await events.getJsonContent(eventId)
        const data = { ...before, ...patch }
        await writeFile(join(dir, path), JSON.stringify(data), 'utf-8')
        await updateIndex(join(dir, parent, 'index.json'), id, { ...event, ...data })
        events.add({ ...event, ...data, id, type: 'updated' })
        res.sendStatus(200)
      } catch {
        next()
      }
    })
  }
}
