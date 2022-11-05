import { Router, json } from 'express'
import { events } from './events'
import { v4 as uuid } from 'uuid'
import { mkdir, writeFile, rm, readFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'

const dir = './data'

export const generic = Router()
generic.use(json())

generic.post('*', async ({ body, path }, res) => {
  const id = uuid()
  const content = { ...body, [path.replace(/^\//, '')]: id }
  await mkdir(join(dir, path), { recursive: true })
  await writeFile(join(dir, path, id), JSON.stringify(content))

  await events.add({ ...content, type: 'created' })
  res.status(201).json(id)
})
generic.delete('*', async ({ path }, res, next) => {
  try {
    const data = await readFile(join(dir, path), { encoding: 'utf-8' })
    await rm(join(dir, path))
    const [_, k, v] = /^\/?(.*)\/([^/]+)$/.exec(path) || []
    const content = JSON.parse(data)
    await events.add({ type: 'deleted', [k]: v, content })
    res.sendStatus(200)
  } catch {
    next()
  }
})
generic.patch('*', async ({ body, path }, res, next) => {
  try {
    const data = await readFile(join(dir, path), { encoding: 'utf-8' })
    const content = JSON.parse(data)
    await writeFile(join(dir, path), JSON.stringify({ ...content, ...body }))
    const [_, k, v] = /^\/?(.*)\/([^/]+)$/.exec(path) || []
    await events.add({ ...body, type: 'updated', [k]: v })
    res.sendStatus(200)
  } catch {
    next()
  }
})
generic.get('*', async ({ path, query }, res, next) => {
  try {
    const data = await readFile(join(dir, path), { encoding: 'utf-8' })
    const content = JSON.parse(data)
    res.json(content)
  } catch (e: any) {
    if (e.code === 'EISDIR') {
      try {
        const files = await readdir(join(dir, path), { withFileTypes: true })
        const items = files.map(async (type) => {
          if (!type.isFile()) return
          const file = type.name
          const data = await readFile(join(dir, path, file), { encoding: 'utf-8' })
          const content = JSON.parse(data)
          return { ...content, id: file }
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
      } catch (e) {
        console.log(e)
        next()
      }
    }
    next()
  }
})

events.on('created', async (ev) => {
  Object.entries(ev).forEach(async ([k, v]) => {
    if (typeof v !== 'string') return
    try {
      const before = await readFile(join(dir, k, v), { encoding: 'utf-8' })
      const content = JSON.parse(before)
      console.log(k, v, content)
      if (content[k] && content[k] !== v) {
        if (Array.isArray(content[k])) content[k].push(v)
        else content[k] = [content[k], v]
      }
      const after = JSON.stringify(content)
      if (before === after) return
      await writeFile(join(dir, k, v), after)
    } catch {
      await mkdir(join(dir, k), { recursive: true })
      await writeFile(join(dir, k, v), JSON.stringify(ev))
    }
  })
})

events.on('deleted', async (ev) => {
  const { content, ...keys } = ev
  Object.entries(content).forEach(async ([k, v]) => {
    if (typeof v !== 'string') return
    try {
      const before = await readFile(join(dir, k, v), { encoding: 'utf-8' })
      const content = JSON.parse(before)
      Object.entries(keys).forEach(([k, v]) => {
        if (content[k] === v) {
          console.log('delete', content[k])
          delete content[k]
        }
      })
      const after = JSON.stringify(content)
      if (before === after) return
      await writeFile(join(dir, k, v), after)
    } catch (e) {}
  })
})
