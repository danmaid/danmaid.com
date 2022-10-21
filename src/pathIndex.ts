import { core, Event, Resolver, Listener } from './core'
import { dirname, join, basename, parse } from 'node:path'
import { appendFile, mkdir, access, stat, rename, rm, writeFile } from 'node:fs/promises'
import { createReadStream, createWriteStream, constants } from 'node:fs'
import { createInterface } from 'node:readline'

const indexFile = 'index.jsonl'

export type IndexEvent = PathEvent | IndexedEvent
export interface PathEvent extends Event {
  type: 'created' | 'updated'
  path: string
}
export interface IndexedEvent extends Event {
  type: 'created' | 'updated'
  path: string
  size: number
}

export async function updateIndex(file: string, ev: Event): Promise<number> {
  await access(file, constants.R_OK)
  const before = await stat(file)
  const newFile = join(dirname(file), new Date().getTime() + '.jsonl')
  const size = await new Promise<number>((resolve) => {
    const rl = createInterface(createReadStream(file))
    const w = createWriteStream(newFile)
    let size = 0
    let updated = false
    rl.on('line', (line) => {
      size++
      const index = JSON.parse(line)
      if (index.id !== ev.id) return w.write(line + '\n')
      w.write(JSON.stringify(ev) + '\n')
      updated = true
    })
    rl.on('close', () => {
      if (!updated) {
        w.write(JSON.stringify(ev) + '\n')
        size++
      }
      w.close()
      resolve(size)
    })
  })
  const after = await stat(file)
  if (before.mtimeMs !== after.mtimeMs) throw Error('mtime different.')
  await rm(file, { force: true })
  await rename(newFile, file)
  return size
}

export const canIndexResolver: Resolver<PathEvent> = (ev) =>
  typeof ev.path === 'string' &&
  ev.path.length > 1 &&
  !ev.path.endsWith(indexFile) &&
  (ev.type === 'created' || ev.type === 'updated')

export const createOrUpdateIndexListener: Listener<PathEvent> = async (ev) => {
  const path = ev.path.replace(/\/[^/]*$/, '')
  const dir = join('data', path)
  await mkdir(dir, { recursive: true })
  const file = join(dir, indexFile)
  try {
    const size = await updateIndex(file, ev)
    core.emit<IndexedEvent>({ type: 'updated', path, size })
  } catch {
    await writeFile(file, JSON.stringify(ev) + '\n')
    core.emit<IndexedEvent>({ type: 'created', path, size: 1 })
  }
}

core.on<PathEvent>(canIndexResolver, createOrUpdateIndexListener)
