import { Router } from 'express'
import { readFile, writeFile } from 'node:fs/promises'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { events as eventStore } from './events'

export const todos = Router()

const dir = './data/todos'
mkdirSync(dir, { recursive: true })

const comments = todos.route('/todos/:id/comments')

comments.post(async ({ params: { id }, body }, res, next) => {
  try {
    const text = await readFile(join(dir, id), { encoding: 'utf-8' })
    const data = JSON.parse(text)
    const comments: string[] = data.comments || []
    comments.push(body)

    const event = { date: new Date(), type: 'created', todo: id, message: body }
    const eventId = await eventStore.add(event)

    await writeFile(join(dir, id), JSON.stringify({ ...data, comments, last_event: { ...event, event: eventId } }))
    res.sendStatus(201)
  } catch {
    res.sendStatus(404)
  }
})

const events = todos.route('/todos/:id/events')

events.get(async ({ params: { id } }, res, next) => {
  const events = await eventStore.filter((v) => v.event.todo === id)
  res.json(events.map((v) => v.event))
})
