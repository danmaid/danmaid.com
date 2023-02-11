import { dirname } from 'node:path'
import { accessSync, closeSync, openSync, createReadStream, mkdirSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { appendFile } from 'node:fs/promises'

export class Jsonl<T> {
  constructor(public path: string) {
    mkdirSync(dirname(path), { recursive: true })
    try {
      accessSync(path)
    } catch (err) {
      closeSync(openSync(path, 'w'))
    }
  }

  async read(): Promise<T[]> {
    return await new Promise((resolve, reject) => {
      const items: T[] = []
      const rl = createInterface(createReadStream(this.path))
      rl.on('line', (line) => items.push(JSON.parse(line)))
      rl.on('error', () => reject())
      rl.on('close', () => resolve(items))
    })
  }

  async append(item: T): Promise<void> {
    return appendFile(this.path, JSON.stringify(item))
  }
}
