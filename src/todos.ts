import { Router, json } from 'express'
import { v4 as uuid } from 'uuid'
import { readdir, readFile, writeFile, rm } from 'node:fs/promises'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

export const todos = Router()

const dir = './data/todos'
mkdirSync(dir, { recursive: true })

todos.use(json())

const items = todos.route('/todos')

items.get(async (req, res, next) => {
  const files = await readdir(dir)
  const items = files.map(async (file) => {
    const text = await readFile(join(dir, file), { encoding: 'utf-8' })
    const data = JSON.parse(text)
    return { ...data, id: file }
  })
  res.json(await Promise.all(items))
})

items.post(async ({ body }, res, next) => {
  const id = uuid()
  await writeFile(join(dir, id), JSON.stringify(body))
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
    await rm(join(dir, id))
    res.end()
  } catch (err) {
    res.sendStatus(404)
  }
})
