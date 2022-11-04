import { Router, json } from 'express'
import { v4 as uuid } from 'uuid'
import { readdir, readFile, writeFile, rm } from 'node:fs/promises'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { events as eventStore } from './events'

export const schedules = Router()

const dir = './data/schedules'
mkdirSync(dir, { recursive: true })

schedules.use(json())

const items = schedules.route('/schedules')

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

items.post(async ({ body }, res, next) => {
  const id = uuid()
  const event = { ...body, date: new Date(), type: 'created', schedule: id }
  const eventId = await eventStore.add(event)

  await writeFile(join(dir, id), JSON.stringify({ ...body, last_event: { ...event, event: eventId } }))
  res.status(201).json(id)
})

const item = schedules.route('/schedules/:id')

item.get(async ({ params: { id } }, res, next) => {
  try {
    const text = await readFile(join(dir, id), { encoding: 'utf-8' })
    const data = JSON.parse(text)
    res.json({ ...data, id })
  } catch {
    res.sendStatus(404)
  }
})

item.delete(async ({ params: { id } }, res, next) => {
  try {
    await eventStore.add({ date: new Date(), type: 'deleted', schedule: id })

    await rm(join(dir, id))
    res.end()
  } catch (err) {
    res.sendStatus(404)
  }
})

item.patch(async ({ params: { id }, body }, res, next) => {
  try {
    const event = { ...body, date: new Date(), type: 'updated', schedule: id }
    const eventId = await eventStore.add(event)

    const text = await readFile(join(dir, id), { encoding: 'utf-8' })
    const data = JSON.parse(text)
    await writeFile(join(dir, id), JSON.stringify({ ...data, ...body, last_event: { ...event, event: eventId } }))
    res.end()
  } catch {
    res.sendStatus(404)
  }
})
