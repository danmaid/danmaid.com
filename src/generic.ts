import { Router, json } from 'express'
import { events } from './events'
import { v4 as uuid } from 'uuid'
import { appendFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { mkdirSync, createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

const index = './data/index.jsonl'
mkdirSync(dirname(index), { recursive: true })

export const generic = Router()
generic.use(json())

generic.post('*', async ({ body, path }, res) => {
  const id = uuid()
  const data = { ...body, [path.replace(/^\//, '')]: id }
  await appendFile(index, JSON.stringify(data) + '\n')
  await events.add({ ...data, type: 'created' })
  res.status(201).json(id)
})

const items = generic.route('/:key')

items.get(async ({ params: { key }, query }, res, next) => {
  try {
    const items: any[] = await new Promise((resolve, reject) => {
      const items: any[] = []
      const rl = createInterface(createReadStream(index))
      rl.on('error', reject)
      rl.on('line', (line: string) => {
        try {
          const index = JSON.parse(line)
          if (index[key]) items.push(index)
        } catch {}
      })
      rl.on('close', () => resolve(items))
    })
    if (Object.keys(query).length > 0) {
      const filtered = items.filter((item) => {
        return Object.entries(query).every(([k, v]) => {
          return typeof v === 'string' && v.startsWith('!') ? item[k] !== v.slice(1) : item[k] === v
        })
      })
      if (filtered.length < 1) return res.sendStatus(404)
      res.json(filtered.map((v) => ({ ...v, id: v[key] })))
    } else res.json(items.map((v) => ({ ...v, id: v[key] })))
  } catch {
    res.json([])
  }
})

const item = generic.route('/:key/:value')

item.get(async ({ params: { key, value }, query }, res, next) => {
  try {
    const items: any[] = await new Promise((resolve, reject) => {
      const items: any[] = []
      const rl = createInterface(createReadStream(index))
      rl.on('error', reject)
      rl.on('line', (line: string) => {
        try {
          const index = JSON.parse(line)
          if (index[key] === value) items.push(index)
        } catch {}
      })
      rl.on('close', () => resolve(items))
    })
    if (items.length < 1) return res.sendStatus(404)
    if (items.length === 1) return res.json(items[0])
    res.json(items)
  } catch {
    next()
  }
})

item.delete(async ({ params: { key, value } }, res, next) => {
  try {
    let deleted = 0
    const items: string[] = await new Promise((resolve, reject) => {
      const items: Set<string> = new Set()
      const rl = createInterface(createReadStream(index))
      rl.on('error', reject)
      rl.on('line', (line: string) => {
        try {
          const index = JSON.parse(line)
          if (index[key] === value) {
            delete index[key]
            if (Object.keys(index).length > 0) {
              items.add(JSON.stringify(index))
              deleted++
            }
          } else items.add(line)
        } catch {}
      })
      rl.on('close', () => resolve(Array.from(items)))
    })
    if (deleted === 0) return next()
    await writeFile(index, items.join('\n') + '\n')
    await events.add({ type: 'deleted', [key]: value })
    res.sendStatus(200)
  } catch {
    next()
  }
})

item.patch(async ({ params: { key, value }, body }, res, next) => {
  try {
    let patched = 0
    const items: string[] = await new Promise((resolve, reject) => {
      const items: Set<string> = new Set()
      const rl = createInterface(createReadStream(index))
      rl.on('error', reject)
      rl.on('line', (line: string) => {
        try {
          const index = JSON.parse(line)
          if (index[key] === value) {
            items.add(JSON.stringify({ ...index, ...body }))
            patched++
          } else items.add(line)
        } catch {}
      })
      rl.on('close', () => resolve(Array.from(items)))
    })
    if (patched === 0) return next()
    await writeFile(index, items.join('\n') + '\n')
    await events.add({ ...body, type: 'updated', [key]: value })
    res.sendStatus(200)
  } catch {
    next()
  }
})
