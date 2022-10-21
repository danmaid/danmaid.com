import { core, Event } from './core'
import { dirname, join, basename, parse } from 'node:path'
import { appendFile, mkdir, access, stat, rename, rm, writeFile } from 'node:fs/promises'
import { createReadStream, createWriteStream, constants } from 'node:fs'
import { createInterface } from 'node:readline'

export interface IndexedEvent extends Event {
  id: string
  type: 'created' | 'updated'
  path: string
  size?: number
}

core.on<IndexedEvent>(
  (ev) => typeof ev.path === 'string' && ev.path.length > 1 && ev.type === 'created',
  async (ev) => {
    const path = dirname(ev.path)
    const base = basename(ev.path)
    const dir = join('data', path)
    const file = join(dir, 'index.jsonl')
    await mkdir(dir, { recursive: true })
    await appendFile(file, JSON.stringify(ev) + '\n')
    const size = await new Promise<number>((resolve) => {
      const reader = createInterface(createReadStream(file))
      let lines = 0
      reader.on('line', () => lines++)
      reader.once('close', () => resolve(lines))
    })
    core.emit<IndexedEvent>({ id: base, path: ev.path + '/index.jsonl', type: 'updated', size })
  }
)

core.on<IndexedEvent>(
  (ev) => typeof ev.path === 'string' && ev.path.length > 1 && ev.type === 'updated',
  async (ev) => {
    const path = dirname(ev.path)
    const base = basename(ev.path)
    const dir = join('data', path)
    const file = join(dir, 'index.jsonl')
    await mkdir(dir, { recursive: true })

    const newLine = JSON.stringify({ ...ev, id: base }) + '\n'
    let size = 0
    try {
      await access(file, constants.R_OK)
      const before = await stat(file)
      const newFile = join(dir, `${ev.id}.jsonl`)
      new Promise<number>((resolve) => {
        const rl = createInterface(createReadStream(file))
        const w = createWriteStream(newFile)
        let updated = false
        rl.on('line', (line) => {
          size++
          const index = JSON.parse(line)
          if (index.id !== base) return w.write(line + '\n')
          w.write(newLine)
          updated = true
        })
        rl.on('close', () => {
          if (!updated) {
            w.write(newLine)
            size++
          }
          w.close()
          resolve(size)
        })
      })
      const after = await stat(file)
      if (before.mtimeMs !== after.mtimeMs) {
        return console.error('mtime different.')
      }
      await rm(file, { force: true })
      await rename(newFile, file)
    } catch {
      await writeFile(file, newLine)
      size++
    }

    core.emit<IndexedEvent>({ id: base, path, type: 'updated', size })
  }
)
