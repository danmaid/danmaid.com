import { Router } from 'express'
import { readFile, writeFile } from 'node:fs/promises'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { events } from './events'
import { sequencer } from '.'

export const sensors = Router()

const dir = './data/sensors'
mkdirSync(dir, { recursive: true })

sensors.post('/sensors/:id/events', async ({ params: { id } }, res, next) => {
  try {
    const { id: eventId, event } = res.locals.event
    const before = JSON.parse(await readFile(join(dir, id), 'utf-8').catch(() => '{}'))
    const patch = JSON.parse(await readFile(join(events.dir, eventId), 'utf-8'))
    const data = { ...before, ...patch }
    await writeFile(join(dir, id), JSON.stringify(data), 'utf-8')

    const index = join(dir, 'index.json')
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
  } catch {
    next()
  }
})
