import { Router } from 'express'
import { readFile, writeFile } from 'node:fs/promises'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { events } from './events'
import { sequencer } from '.'

export const todos = Router()

const dir = './data/todos'
mkdirSync(dir, { recursive: true })

todos.post('/todos/:id/comments', async ({ params: { id } }, res, next) => {
  try {
    const { id: eventId, event } = res.locals.event
    const comment = await readFile(join(events.dir, eventId), 'utf-8')
    const data = JSON.parse(await readFile(join(dir, id), { encoding: 'utf-8' }))
    const comments: string[] = data.comments || []
    comments.push(comment)
    await writeFile(join(dir, id), JSON.stringify({ ...data, comments }))

    const index = join(dir, 'index.json')
    const updateIndex = (sequencer.get(index) || Promise.resolve()).then(async () => {
      const indexes: { id: string }[] = JSON.parse(await readFile(index, 'utf-8'))
      const i = indexes.findIndex((v) => v.id === id)
      if (i >= 0) indexes.splice(i, 1)
      indexes.push({ ...event, ...data, comments, id })
      await writeFile(index, JSON.stringify(indexes), 'utf-8')
    })
    sequencer.set(index, updateIndex)
    await updateIndex

    await events.add({ ...event, ...data, comments, id, type: 'updated' })
    res.sendStatus(200)
  } catch {
    next()
  }
})

todos.get('/todos/:id/events', async ({ params: { id } }, res, next) => {
  const e = await events.filter(({ event }) => event.path.startsWith('/todos') && event.id === id)
  res.json(e.map((v) => v.event))
})
