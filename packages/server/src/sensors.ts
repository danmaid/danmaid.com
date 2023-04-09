import { Router } from 'express'
import { readFile, writeFile, access, mkdir } from 'node:fs/promises'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { events } from './events'
import { addIndex, updateIndex } from './resource'

export const sensors = Router()

const dir = './data/sensors'
mkdirSync(dir, { recursive: true })

sensors.post('/sensors/:id/*', async ({ headers, params: { id } }, res, next) => {
  try {
    await access(join(dir, id))
    next()
  } catch {
    try {
      const { id: eventId, event } = res.locals.event
      await events.copyContent(eventId, join(dir, id), headers['content-type'])
      const data = headers['content-type'] === 'application/json' ? await events.getJsonContent(eventId) : {}
      await addIndex(join(dir, 'index.json'), id, { ...event, ...data })
      events.add({ ...event, ...data, id, type: 'created' })
      next()
    } catch {
      next()
    }
  }
})

sensors.post('/sensors/:id/events', async ({ params: { id } }, res, next) => {
  try {
    const { id: eventId, event } = res.locals.event
    const before = JSON.parse(await readFile(join(dir, id), 'utf-8'))
    const patch = await events.getJsonContent(eventId)
    const data = { ...before, ...patch }
    await writeFile(join(dir, id), JSON.stringify(data), 'utf-8')
    await updateIndex(join(dir, 'index.json'), id, { ...event, ...data })
    events.add({ ...event, ...data, id, type: 'updated' })
    res.sendStatus(200)
  } catch {
    next()
  }
})
