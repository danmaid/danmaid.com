import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { join, parse } from 'node:path'

export class FileIndex<T extends { id: string }> {
  dir: string
  file: string
  id: string
  constructor(path: string) {
    const { dir, name } = parse(path)
    this.dir = dir
    this.file = join(dir, 'index.json')
    this.id = name
  }

  async set(value: T): Promise<void> {
    const index = { ...value, id: this.id }
    try {
      const text = await readFile(this.file, { encoding: 'utf-8' })
      const indexes: T[] = JSON.parse(text)
      const i = indexes.findIndex((v) => v.id === this.id)
      if (i >= 0) indexes.splice(i, 1)
      indexes.push(index)
      await writeFile(this.file, JSON.stringify(indexes))
    } catch {
      await mkdir(this.dir, { recursive: true })
      await writeFile(this.file, JSON.stringify([index]))
    }
  }

  async get(): Promise<T> {
    const text = await readFile(this.file, { encoding: 'utf-8' })
    const indexes: T[] = JSON.parse(text)
    const index = indexes.find((v) => v.id === this.id)
    if (!index) throw Error('Not Found.')
    return index
  }
}
