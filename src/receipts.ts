import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { readFile, writeFile } from 'node:fs/promises'
import { mkdirSync, createReadStream } from 'node:fs'
import { resolve } from 'node:path'
import { events as eventStore } from './events'

type Meta = { id: string; 'Content-Type'?: string; 'Content-Length'?: string }

export const receipts = Router()

const dir = './data/receipts'
mkdirSync(dir, { recursive: true })
const indexFile = resolve(dir, 'index.json')

const items = receipts.route('/receipts')

items.post(async (req, res, next) => {
  const { headers } = req
  const id = uuid()
  const meta: Meta = {
    id,
    'Content-Type': headers['content-type'],
    'Content-Length': headers['content-length'],
  }
  await writeFile(resolve(dir, id), req)
  const index = JSON.parse(await readFile(indexFile, 'utf-8').catch(() => '[]'))
  index.push(meta)
  await writeFile(indexFile, JSON.stringify(index), 'utf-8')

  const event = { ...meta, type: 'created', receipt: id }
  await eventStore.add(event)
  res.status(201).json(id)
})

items.get(async (req, res, next) => {
  res.sendFile(resolve(indexFile))
})

const item = receipts.route('/receipts/:id')

item.get(async ({ params: { id } }, res, next) => {
  try {
    const index: Meta[] = JSON.parse(await readFile(indexFile, 'utf-8'))
    const meta = index.find((v) => v.id === id)
    if (!meta) return next()
    const { id: _, ...headers } = meta
    res.set(headers)
    const reader = createReadStream(resolve(dir, id))
    reader.pipe(res)
  } catch {
    next()
  }
})
