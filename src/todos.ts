import { Router, json } from 'express'
import { v4 as uuid } from 'uuid'

export const todos = Router()

const store = new Map<string, Record<string, unknown>>()

todos.use(json())

const items = todos.route('/todos')

items.get((req, res, next) => {
  res.setHeader('Content-Type', 'application/json')
  const arr = Array.from(store)
  const data = arr.map(([id, item]) => ({ ...item, id }))
  res.json(data)
})

items.post(({ body }, res, next) => {
  const id = uuid()
  store.set(id, body)
  res.status(201).json(id)
})

const item = todos.route('/todos/:id')

item.get(({ params: { id } }, res, next) => {
  const item = store.get(id)
  item ? res.json(item) : res.sendStatus(404)
})

item.delete(({ params: { id } }, res, next) => {
  store.delete(id) ? res.sendStatus(200) : res.sendStatus(404)
})
