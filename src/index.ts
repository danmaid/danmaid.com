import http from 'node:http'
import express from 'express'
import { todos } from './todos'
import { sensors } from './sensors'
import { sse } from './sse'
import { events } from './events'
import { mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { createReadStream } from 'node:fs'

const dir = './data'

export const sequencer = new Map<string, Promise<any>>()

export class Server extends http.Server {
  constructor(public app = express()) {
    super(app)
    app.use(async (req, res, next) => {
      const { method, path } = req
      const event = { ...req.headers, method, path }
      const hasContent = parseInt(req.headers['content-length'] || '')
      const ev = await events.add(event, hasContent ? req : undefined)
      const { id, date } = ev
      res.setHeader('Event-ID', id)
      res.setHeader('Event-Date', date.toISOString())
      if (hasContent) req.body = id
      res.locals.event = ev
      next()
    })
    app.use(sse)
    app.use(todos)
    app.use(sensors)
    app.post('*', async ({ path, headers }, res, next) => {
      try {
        const { id, event } = res.locals.event
        await mkdir(join(dir, path), { recursive: true })
        await copyFile(join(events.dir, id), join(dir, path, id))

        const data: Record<string, unknown> = await new Promise((resolve) => {
          if (headers['content-type'] !== 'application/json') resolve({})
          readFile(join(events.dir, id), 'utf-8')
            .then((text) => resolve(JSON.parse(text)))
            .catch(() => resolve({}))
        })

        const index = join(dir, path, 'index.json')
        const addIndex = (sequencer.get(index) || Promise.resolve()).then(async () => {
          const text = await readFile(index, 'utf-8').catch(() => '[]')
          const indexes: unknown[] = JSON.parse(text)
          indexes.push({ ...event, ...data, id })
          await writeFile(index, JSON.stringify(indexes), 'utf-8')
        })
        sequencer.set(index, addIndex)
        await addIndex
        events.add({ ...event, ...data, id, type: 'created' })
        res.status(201).json(id)
      } catch {
        next()
      }
    })
    app.get(':parent(*)/:id', async ({ path, params: { parent, id } }, res, next) => {
      try {
        const text = await readFile(join(dir, parent, 'index.json'), 'utf-8')
        const indexes: { id: string; 'content-type'?: string; 'content-length'?: string }[] = JSON.parse(text)
        const index = indexes.find((v) => v.id === id)
        if (!index) return next()

        res.set({ 'content-type': index['content-type'] })
        const reader = createReadStream(join(dir, path))
        reader.on('error', () => next())
        reader.pipe(res)
        await new Promise((r) => reader.on('end', r))
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
        const index = join(dir, parent, 'index.json')
        const deleteIndex = (sequencer.get(index) || Promise.resolve()).then(async () => {
          const text = await readFile(index, 'utf-8')
          const indexes: { id: string; 'content-type'?: string; 'content-length'?: string }[] = JSON.parse(text)
          const i = indexes.findIndex((v) => v.id === id)
          if (i >= 0) {
            indexes.splice(i, 1)
            await writeFile(index, JSON.stringify(indexes), 'utf-8')
          }
        })
        sequencer.set(index, deleteIndex)
        await deleteIndex
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
        const patch = JSON.parse(await readFile(join(events.dir, eventId), 'utf-8'))
        const data = { ...before, ...patch }
        await writeFile(join(dir, path), JSON.stringify(data), 'utf-8')

        const index = join(dir, parent, 'index.json')
        const updateIndex = (sequencer.get(index) || Promise.resolve()).then(async () => {
          const indexes: { id: string }[] = JSON.parse(await readFile(index, 'utf-8').catch(() => '[]'))
          const i = indexes.findIndex((v) => v.id === id)
          if (i >= 0) indexes.splice(i, 1)
          indexes.push({ ...event, ...data, id })
          await writeFile(index, JSON.stringify(indexes), 'utf-8')
        })
        sequencer.set(index, updateIndex)
        await updateIndex
        events.add({ ...event, ...data, id, type: 'updated' })
        res.sendStatus(200)
      } catch (e) {
        console.error(e)
        next()
      }
    })
  }
}
