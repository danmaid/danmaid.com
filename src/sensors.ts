import { Router, json } from 'express'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { events as eventStore } from './events'

export const sensors = Router()

const dir = './data/sensors'
mkdirSync(dir, { recursive: true })

sensors.use(json())

const items = sensors.route('/sensors')

items.get(async ({ query }, res, next) => {
  const files = await readdir(dir)
  const items = files.map(async (file) => {
    const text = await readFile(join(dir, file), { encoding: 'utf-8' })
    const data = JSON.parse(text)
    return { ...data, id: file }
  })
  const data = await Promise.all(items)
  if (Object.keys(query).length > 0) {
    const filtered = data.filter((item) => {
      return Object.entries(query).every(([k, v]) => {
        return typeof v === 'string' && v.startsWith('!') ? item[k] !== v.slice(1) : item[k] === v
      })
    })
    res.json(filtered)
  } else res.json(data)
})

const item = sensors.route('/sensors/:id')

item.get(async ({ params: { id } }, res, next) => {
  try {
    const text = await readFile(join(dir, id), { encoding: 'utf-8' })
    const data = JSON.parse(text)
    res.json({ ...data, id })
  } catch {
    res.sendStatus(404)
  }
})

const events = sensors.route('/sensors/:id/events')

events.post(async ({ params: { id }, body }, res, next) => {
  const eventId = await eventStore.add({ ...body, date: new Date(), sensor: id })
  try {
    const text = await readFile(join(dir, id), { encoding: 'utf-8' })
    const sensor = JSON.parse(text)

    await writeFile(join(dir, id), JSON.stringify({ ...sensor, ...body, event: eventId }))
    res.sendStatus(201)
  } catch {
    await writeFile(join(dir, id), JSON.stringify({ ...body, event: eventId }))
    res.sendStatus(201)
  }
})
