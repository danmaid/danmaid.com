import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Core } from './core'
import { isLoadEvent, isSavedEvent, SavedEvent } from './FileStore'

export interface IndexEvent {
  type: 'index'
  path: string
}
export function isIndexEvent(ev: any): ev is IndexEvent {
  if (ev.type !== 'index') return false
  if (typeof ev.path !== 'string') return false
  return true
}

export interface IndexedEvent {
  type: 'indexed'
  path: string
}
export function isIndexedEvent(ev: any): ev is IndexedEvent {
  if (ev.type !== 'indexed') return false
  if (typeof ev.path !== 'string') return false
  return true
}

export class FileIndex {
  constructor(core: Core) {
    core.on(isSavedEvent, (ev: any) => this.onrequest(ev))
    core.on(isLoadEvent, (ev: any) => this.onload(ev))
  }

  async onrequest(ev: SavedEvent) {
    const { path, ...rest } = ev
    const event = { ...rest, path }
    if (path === '/index.json') return
    if (path.endsWith('/index.json')) {
      event.path = path.replace(/\/index\.json$/, '')
    }
    try {
      return await this.updateIndex(event)
    } catch {
      return await this.createIndex(event)
    }
  }

  async onload(ev: IndexEvent) {
    const { path, ...rest } = ev
    const id = path.replace(/.*\//, '')
    const file = path.replace(/\/[^/]+$/, '/index.json')
    const text = await readFile(join('./data', file), { encoding: 'utf-8' })
    const indexes: { id: string }[] = JSON.parse(text)
    const index = indexes.find((v) => v.id === id)
    return { ...index, ...rest, type: 'loaded', path }
  }

  async createIndex(ev: SavedEvent) {
    const { path, ...rest } = ev
    const content = JSON.stringify([{ ...rest, id: path.replace(/.*\//, '') }])
    return {
      ...rest,
      type: 'save',
      path: path.replace(/\/[^/]+$/, '/index.json'),
      content,
      'content-length': content.length.toString(),
      'content-type': 'application/json',
    }
  }

  async updateIndex(ev: SavedEvent) {
    const { path, ...rest } = ev
    const id = path.replace(/.*\//, '')
    const file = path.replace(/\/[^/]+$/, '/index.json')
    const text = await readFile(join('./data', file), { encoding: 'utf-8' })
    const indexes: { id: string }[] = JSON.parse(text)
    const i = indexes.findIndex((v) => v.id === id)
    if (i >= 0) indexes.splice(i, 1)
    indexes.push({ ...rest, id })
    const content = JSON.stringify(indexes)
    return {
      ...rest,
      type: 'save',
      path: file,
      content,
      'content-length': content.length.toString(),
      'content-type': 'application/json',
    }
  }

  // async set(value: T): Promise<void> {
  //   const index = { ...value, id: this.id }
  //   try {
  //     const text = await readFile(this.file, { encoding: 'utf-8' })
  //     const indexes: T[] = JSON.parse(text)
  //     const i = indexes.findIndex((v) => v.id === this.id)
  //     if (i >= 0) indexes.splice(i, 1)
  //     indexes.push(index)
  //     await writeFile(this.file, JSON.stringify(indexes))
  //   } catch {
  //     await mkdir(this.dir, { recursive: true })
  //     await writeFile(this.file, JSON.stringify([index]))
  //   }
  // }

  // async get(): Promise<T> {
  //   const text = await readFile(this.file, { encoding: 'utf-8' })
  //   const indexes: T[] = JSON.parse(text)
  //   const index = indexes.find((v) => v.id === this.id)
  //   if (!index) throw Error('Not Found.')
  //   return index
  // }
}
