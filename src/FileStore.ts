import { Core } from './core'
import { Readable } from 'node:stream'
import { writeFile, mkdir } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { join, dirname } from 'node:path'

export interface SaveEvent {
  type: 'save'
  path: string
  content: Readable | string
}
export function isSaveEvent(ev: any): ev is SaveEvent {
  if (ev.type !== 'save') return false
  if (typeof ev.path !== 'string') return false
  if (typeof ev.content !== 'string' && !(ev.content instanceof Readable)) return false
  return true
}

export interface SavedEvent {
  type: 'saved'
  path: string
}
export function isSavedEvent(ev: any): ev is SavedEvent {
  if (ev.type !== 'saved') return false
  if (typeof ev.path !== 'string') return false
  return true
}

export interface LoadEvent {
  type: 'load'
  path: string
}
export function isLoadEvent(ev: any): ev is LoadEvent {
  if (ev.type !== 'load') return false
  if (typeof ev.path !== 'string') return false
  return true
}

export interface LoadedEvent {
  type: 'loaded'
  path: string
  content: Readable
}
export function isLoadedEvent(ev: any): ev is LoadedEvent {
  if (ev.type !== 'loaded') return false
  if (typeof ev.path !== 'string') return false
  if (!(ev.content instanceof Readable)) return false
  return true
}

export class FileStore {
  dataDir = './data'

  constructor(core: Core) {
    core.on(isSaveEvent, (ev: any) => this.onsave(ev))
    core.on(isLoadEvent, (ev: any) => this.onload(ev))
  }

  async onsave(ev: SaveEvent): Promise<SavedEvent> {
    const { path, content, ...rest } = ev
    const file = join(this.dataDir, path)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, content)
    return { ...rest, type: 'saved', path }
  }

  async onload(ev: LoadEvent): Promise<LoadedEvent> {
    const { path, ...rest } = ev
    const content = createReadStream(join(this.dataDir, path))
    return { ...rest, type: 'loaded', path, content }
  }
}
