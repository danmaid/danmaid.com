import { Router, json, text } from 'express'
import { v4 as uuid } from 'uuid'
import { readdir, readFile, writeFile, rm } from 'node:fs/promises'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

export const todos = Router()

const dir = './data/todos'
mkdirSync(dir, { recursive: true })
const eventDir = './data/events'
mkdirSync(eventDir, { recursive: true })

todos.use(json())
todos.use(text())

const items = todos.route('/todos')

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
  const eventId = uuid()
  const event = { ...body, date: new Date(), type: 'created', todo: id }
  await writeFile(join(eventDir, eventId), JSON.stringify(event))
  await writeFile(join(dir, id), JSON.stringify({ ...body, last_event: { ...event, event: eventId } }))
  res.status(201).json(id)
})

const item = todos.route('/todos/:id')

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
    const eventId = uuid()
    const event = { date: new Date(), type: 'deleted', todo: id }
    await writeFile(join(eventDir, eventId), JSON.stringify(event))

    await rm(join(dir, id))
    res.end()
  } catch (err) {
    res.sendStatus(404)
  }
})

item.patch(async ({ params: { id }, body }, res, next) => {
  try {
    const eventId = uuid()
    const event = { ...body, date: new Date(), type: 'updated', todo: id }
    await writeFile(join(eventDir, eventId), JSON.stringify(event))

    const text = await readFile(join(dir, id), { encoding: 'utf-8' })
    const data = JSON.parse(text)
    await writeFile(join(dir, id), JSON.stringify({ ...data, ...body, last_event: { ...event, event: eventId } }))
    res.end()
  } catch {
    res.sendStatus(404)
  }
})

const comments = todos.route('/todos/:id/comments')

comments.post(async ({ params: { id }, body }, res, next) => {
  try {
    const text = await readFile(join(dir, id), { encoding: 'utf-8' })
    const data = JSON.parse(text)
    const comments: string[] = data.comments || []
    comments.push(body)

    const eventId = uuid()
    const event = { date: new Date(), type: 'created', todo: id, message: body }
    await writeFile(join(eventDir, eventId), JSON.stringify(event))

    await writeFile(join(dir, id), JSON.stringify({ ...data, comments, last_event: { ...event, event: eventId } }))
    res.sendStatus(201)
  } catch {
    res.sendStatus(404)
  }
})

const events = todos.route('/todos/:id/events')

events.get(async ({ params: { id } }, res, next) => {
  const files = await readdir(eventDir)
  const items = files.map(async (file): Promise<{ date: string; todo: string }> => {
    const text = await readFile(join(eventDir, file), { encoding: 'utf-8' })
    const data = JSON.parse(text)
    return { ...data, event: file }
  })
  const data = await Promise.all(items)
  res.json(data.filter((v) => v.todo === id).sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0)))
})
