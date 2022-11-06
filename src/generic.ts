import { Router, json } from 'express'
import { events } from './events'
import { v4 as uuid } from 'uuid'
import { appendFile, writeFile, rm, readFile, readdir, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
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

function readIndex<T = any>(filter?: (index: T) => boolean): Promise<T[]> {
  const items: T[] = []
  const online = filter
    ? (line: string) => {
        const index = JSON.parse(line)
        if (filter(index)) items.push(index)
      }
    : (line: string) => items.push(JSON.parse(line))
  return new Promise((resolve, reject) => {
    const rl = createInterface(createReadStream(index))
    rl.on('error', reject)
    rl.on('line', online)
    rl.on('close', () => resolve(items))
  })
}

generic.get('/:key/:value', async ({ params: { key, value } }, res, next) => {
  try {
    console.log(key, value)
    const items = await readIndex((v) => v[key] === value)
    if (items.length < 1) return res.sendStatus(404)
    if (items.length === 1) return res.json(items[0])
    res.json(items)
  } catch {
    next()
  }
})

generic.get('/:key', async ({ params: { key } }, res, next) => {
  try {
    const items = await readIndex((v) => v[key])
    if (items.length < 1) return res.sendStatus(404)
    res.json(items.map((v) => ({ ...v, id: v[key] })))
  } catch {
    next()
  }
})

generic.delete('/:key/:value', async ({ params: { key, value }, path }, res, next) => {
  try {
    const items = await readIndex((v) => v[key] !== value)
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

// events.on('deleted', async (ev) => {
//   const { content, ...keys } = ev
//   Object.entries(content).forEach(async ([k, v]) => {
//     if (typeof v !== 'string') return
//     try {
//       const before = await readFile(join(dir, k, v), { encoding: 'utf-8' })
//       const content = JSON.parse(before)
//       Object.entries(keys).forEach(([k, v]) => {
//         if (content[k] === v) {
//           console.log('delete', content[k])
//           delete content[k]
//         }
//       })
//       const after = JSON.stringify(content)
//       if (before === after) return
//       await writeFile(join(dir, k, v), after)
//     } catch (e) {}
//   })
// })
