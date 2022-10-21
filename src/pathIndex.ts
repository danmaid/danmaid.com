import { core, Event, Listener, Resolver } from './core'
import { dirname, join } from 'node:path'
import { mkdir, access, stat, rename, rm, writeFile } from 'node:fs/promises'
import { createReadStream, createWriteStream, constants } from 'node:fs'
import { createInterface } from 'node:readline'

const indexFile = 'index.jsonl'

export interface PathEvent extends Event {
  path: string
}
export interface IndexedEvent {
  type: 'created' | 'updated'
  path: string
  size: number
}

// Resolver<PathEvent>
export function canIndex(ev: Partial<PathEvent>): ev is PathEvent & { type: 'created' | 'updated' } {
  if (typeof ev.path !== 'string') return false
  if (ev.path.length <= 1) return false
  if (ev.path.endsWith(indexFile)) return false
  if (!(ev.type === 'created' || ev.type === 'updated')) return false
  return true
}

async function prepare(ev: PathEvent): Promise<{ file: string; event: PathEvent; parent: string }> {
  const [, parent, name] = /(.*)\/([^/]*)$/.exec(ev.path) || []
  const event = { ...ev, id: name }
  const dir = join('data', parent)
  await mkdir(dir, { recursive: true })
  const file = join(dir, indexFile)
  return { file, event, parent }
}

// Listener<PathEvent>
export async function createIndex(ev: PathEvent): Promise<IndexedEvent> {
  const { file, event, parent } = await prepare(ev)
  await writeFile(file, JSON.stringify(event) + '\n')
  const result: IndexedEvent = { type: 'created', path: parent, size: 1 }
  core.emit<IndexedEvent & Event>(result)
  return result
}

// Listener<PathEvent>
export async function updateIndex(ev: PathEvent): Promise<IndexedEvent> {
  const { file, event, parent } = await prepare(ev)
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
      if (index.id !== event.id) return w.write(line + '\n')
      w.write(JSON.stringify(event) + '\n')
      updated = true
    })
    rl.on('close', () => {
      if (!updated) {
        w.write(JSON.stringify(event) + '\n')
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
  const result: IndexedEvent = { type: 'updated', path: parent, size }
  core.emit<IndexedEvent & Event>(result)
  return result
}

// Listener<PathEvent>
export async function createOrUpdateIndex(ev: PathEvent): Promise<IndexedEvent> {
  try {
    return await updateIndex(ev)
  } catch {
    return await createIndex(ev)
  }
}

core.on(canIndex, createOrUpdateIndex)
