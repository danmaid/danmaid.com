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
import cors from 'cors'

const dir = './data'

export const sequencer = new Map<string, Promise<any>>()

export class Server extends http.Server {
  constructor(public app = express()) {
    super(app)
    app.use(cors({ origin: ['chrome-extension://ibndfaodijdaghpfgfomkbccnpablmki'] }))
    app.use(async (req, res, next) => {
      const { method, path, headers } = req
      const hasContent = parseInt(headers['content-length'] || '')
      const event = await events.add({ ...headers, method, path }, hasContent ? req : undefined)
      res.setHeader('Event-ID', event.id)
      res.setHeader('Event-Date', event.date.toISOString())
      res.locals.event = event
      next()
    })
    app.use(sse)
    app.use(todos)
    app.use(sensors)
    app
      .route('/:resource')
      .post(async ({ params: { resource }, headers }, res, next) => {
        try {
          const { id, event } = res.locals.event
          await mkdir(join(dir, resource), { recursive: true })
          await events.copyContent(id, join(dir, resource, id), headers['content-type'])
          const data = headers['content-type'] === 'application/json' ? await events.getJsonContent(id) : {}
          await addIndex(join(dir, resource, 'index.json'), id, { ...event, ...data })
          events.add({ ...event, ...data, id, type: 'created' })
          res.status(201).json(id)
        } catch {
          next()
        }
      })
      .get(async ({ params: { resource }, query }, res, next) => {
        try {
          const text = await readFile(join(dir, resource, 'index.json'), 'utf-8')
          const data: Record<string, unknown>[] = JSON.parse(text)
          if (Object.keys(query).length > 0) {
            const filtered = data.filter((item) => {
              return Object.entries(query).every(([k, v]) => {
                return typeof v === 'string' && v.startsWith('!')
                  ? item[k] !== v.slice(1)
                  : !v
                  ? !item[k]
                  : item[k] === v
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

    app
      .route('/:resource/:id')
      .get(async ({ params: { resource, id } }, res, next) => {
        try {
          const index = await getIndex<{ 'content-type'?: string }>(join(dir, resource, 'index.json'), id)
          res.set({ 'content-type': index['content-type'] })
          createReadStream(join(dir, resource, id)).pipe(res)
        } catch {
          next()
        }
      })
      .delete(async ({ params: { resource, id } }, res, next) => {
        try {
          const { event } = res.locals.event
          await rm(join(dir, resource, id))
          await removeIndex(join(dir, resource, 'index.json'), id)
          events.add({ ...event, id, type: 'deleted' })
          res.sendStatus(200)
        } catch {
          next()
        }
      })
      .patch(async ({ params: { resource, id }, headers }, res, next) => {
        try {
          if (headers['content-type'] !== 'application/json') return next()
          const { id: eventId, event } = res.locals.event
          const before = JSON.parse(await readFile(join(dir, resource, id), 'utf-8'))
          const patch = await events.getJsonContent(eventId)
          const data = { ...before, ...patch }
          await writeFile(join(dir, resource, id), JSON.stringify(data), 'utf-8')
          await updateIndex(join(dir, resource, 'index.json'), id, { ...event, ...data })
          events.add({ ...event, ...data, id, type: 'updated' })
          res.sendStatus(200)
        } catch {
          next()
        }
      })

    app.post('*', (req, res) => res.sendStatus(202))
  }
}
