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

generic.get('/:key/:value', async ({ params: { key, value } }, res, next) => {
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

generic.get('/:key', async ({ params: { key } }, res, next) => {
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
    if (items.length < 1) return res.sendStatus(404)
    res.json(items.map((v) => ({ ...v, id: v[key] })))
  } catch {
    next()
  }
})

generic.delete('/:key/:value', async ({ params: { key, value } }, res, next) => {
  try {
    const items: any[] = await new Promise((resolve, reject) => {
      const items: any[] = []
      const rl = createInterface(createReadStream(index))
      rl.on('error', reject)
      rl.on('line', (line: string) => {
        try {
          const index = JSON.parse(line)
          if (index[key] === value) {
            delete index[key]
            if (Object.keys(index).length > 0) items.push(index)
          } else items.push(index)
        } catch {}
      })
      rl.on('close', () => resolve(items))
    })
    await writeFile(index, items.map((v) => JSON.stringify(v)).join('\n') + '\n')
    await events.add({ type: 'deleted', [key]: value })
    res.sendStatus(200)
  } catch {
    next()
  }
})

// generic.patch('*', async ({ body, path }, res, next) => {
//   try {
//     const data = await readFile(join(dir, path), { encoding: 'utf-8' })
//     const content = JSON.parse(data)
//     await writeFile(join(dir, path), JSON.stringify({ ...content, ...body }))
//     const [_, k, v] = /^\/?(.*)\/([^/]+)$/.exec(path) || []
//     await events.add({ ...body, type: 'updated', [k]: v })
//     res.sendStatus(200)
//   } catch {
//     next()
//   }
// })
