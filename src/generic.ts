import { Router, json, RequestHandler } from 'express'
import { events } from './events'
import { v4 as uuid } from 'uuid'
import { writeFile, rm, readFile, readdir, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { mkdirSync } from 'node:fs'

const dir = './data'
const contentsDir = './data/contents'
mkdirSync(contentsDir, { recursive: true })

export const generic = Router()
generic.use(json())

async function addIndex(path: string, id: string) {
  try {
    const before = await readFile(join(dir, `${path}.json`), { encoding: 'utf-8' })
    const indexes: Record<string, unknown>[] = JSON.parse(before)
    const index = indexes.find((v) => v.id === id)
    if (!index) indexes.push({ id, [path.replace(/^\//, '')]: id })
    else {
      const refs = index[path.replace(/^\//, '')]
      if (refs === id) return
      if (!refs) index[path.replace(/^\//, '')] = id
      else if (!Array.isArray(refs)) index[path.replace(/^\//, '')] = [refs, id]
      else if (refs.includes(id)) return
      else refs.push(id)
    }
    await writeFile(join(dir, `${path}.json`), JSON.stringify(indexes))
  } catch (e) {
    await mkdir(join(dir, path), { recursive: true })
    await writeFile(join(dir, path, 'index.json'), JSON.stringify([{ id, [path.replace(/^\//, '')]: id }]))
  }
}

export const post: RequestHandler = async ({ body, path }, res) => {
  const id = uuid()
  await writeFile(join(contentsDir, id), JSON.stringify(body))
  await events.add({ ...body, type: 'created', id })
  // addIndex
  const index = { ...body, id }
  try {
    const before = await readFile(join(dir, path, 'index.json'), { encoding: 'utf-8' })
    const indexes: Record<string, unknown>[] = JSON.parse(before)
    indexes.push(index)
    await writeFile(join(dir, path, 'index.json'), JSON.stringify(indexes))
  } catch (e) {
    await mkdir(join(dir, path), { recursive: true })
    await writeFile(join(dir, path, 'index.json'), JSON.stringify([index]))
  }

  const key = path.replace(/^\//, '')
  Object.entries(body)
    .filter((e): e is [string, string] => typeof e[1] === 'string')
    .map(async ([k, value]) => {
      const data = { id: value, [key]: id }
      try {
        const before = await readFile(join(dir, k, 'index.json'), { encoding: 'utf-8' })
        const indexes: Record<string, unknown>[] = JSON.parse(before)
        const index = indexes.find((v) => v.id === value)
        if (!index) indexes.push(data)
        else {
          const refs = index[key]
          if (refs === id) return
          if (!refs) index[key] = id
          else if (!Array.isArray(refs)) index[key] = [refs, id]
          else if (refs.includes(id)) return
          else refs.push(id)
        }
        await writeFile(join(dir, k, 'index.json'), JSON.stringify(indexes))
      } catch (e) {
        await mkdir(join(dir, k), { recursive: true })
        await writeFile(join(dir, k, 'index.json'), JSON.stringify([data]))
      }
    })
  res.status(201).json(id)
}
generic.post('*', post)

// store.on('updated', async (id, data) => {
//   Object.entries(data).forEach(async ([k, v]) => {
//     if (typeof v !== 'string') return
//     try {
//       const before = await readFile(join(dir, k, v), { encoding: 'utf-8' })
//       const content = JSON.parse(before)
//       console.log(k, v, content)
//       if (content[k] && content[k] !== v) {
//         if (Array.isArray(content[k])) content[k].push(v)
//         else content[k] = [content[k], v]
//       }
//       const after = JSON.stringify(content)
//       if (before === after) return
//       await writeFile(join(dir, k, v), after)
//     } catch {
//       await mkdir(join(dir, k), { recursive: true })
//       await writeFile(join(dir, k, v), JSON.stringify(ev))
//     }
//   })
// })

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
