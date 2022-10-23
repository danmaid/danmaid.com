import { Readable } from 'node:stream'
import { createWriteStream, Stats, constants } from 'node:fs'
import { stat, appendFile, access, mkdir, rm, link, rename } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { core, Event } from './core'

export interface SavedEvent extends Stats {
  type: 'saved'
  file: string
  content?: string
}
export function isSavedEvent<T extends Record<string, unknown>>(ev: T): ev is T & SavedEvent {
  if (ev.type !== 'saved') return false
  if (typeof ev.file !== 'string') return false
  if (ev.content && typeof ev.content !== 'string') return false
  return true
}

export interface ContentEvent extends Event {
  content: Readable
}
export function isContentEvent(ev: Partial<ContentEvent>): ev is ContentEvent {
  if (!(ev.content instanceof Readable)) return false
  return true
}
export interface PathEvent extends Event {
  path: string
}
export function isPathEvent(ev: Partial<PathEvent>): ev is PathEvent {
  if (typeof ev.path !== 'string') return false
  return true
}

export async function saveContent(
  ev: ContentEvent & Partial<PathEvent>,
  options: { path?: string } = ev
): Promise<SavedEvent> {
  const { path } = options
  if (!path) throw Error('path not specified.')
  const content = ev.content
  await saveStream(path, ev.content)
  const stats = await stat(path)
  return { type: 'saved', file: path, content: ev.id, ...stats }
}

async function saveStream(file: string, stream: Readable): Promise<void> {
  const writer = createWriteStream(file)
  const written = new Promise<void>((r) => writer.once('close', r))
  stream.pipe(writer)
  return await written
}

function replacer(k: string, v: unknown): unknown {
  return v instanceof Readable ? '[object Readable]' : v
}

export async function appendIndex(ev: Event & Partial<PathEvent>, options: { file?: string }): Promise<SavedEvent> {
  const { file } = options
  const path = file || ev.path
  if (!path) throw Error('index file not specified.')
  const indexFile = file || path.replace(/\/[^/]*$/, '/index.jsonl')
  await access(indexFile, constants.O_APPEND).catch(() => mkdir(dirname(indexFile), { recursive: true }))
  await appendFile(indexFile, JSON.stringify(ev, replacer) + '\n')
  const stats = await stat(indexFile)
  return { type: 'saved', file: indexFile, ...stats }
}

export async function linkContent(ev: PathEvent & ContentEvent, options: { path: string } = ev): Promise<SavedEvent> {
  const { path: dest } = options
  // todo: Type を推測したい
  const { file: src } = await core.wait<SavedEvent & Event>((e) => isSavedEvent(e) && e.content === ev.id)
  await access(dest)
    .then(() => rm(dest))
    .catch(() => mkdir(dirname(dest), { recursive: true }))
  await link(src, dest)
  const stats = await stat(dest)
  return { type: 'saved', file: dest, ...stats }
}

export interface FileEvent {
  type: 'updated'
  file: string
}

export async function updateFile(
  ev: Pick<FileEvent, 'file'> & { changer: (path: string) => Promise<void> }
): Promise<FileEvent> {
  const { file, changer } = ev
  const before = await stat(file)
  const path = join(dirname(file), `${new Date().getTime()}`)
  try {
    await changer(path)
  } catch (err) {
    await rm(path)
    throw err
  }
  const after = await stat(file)
  if (before.mtimeMs !== after.mtimeMs) throw Error('mtime different.')
  await rm(file, { force: true })
  await rename(path, file)
  return { type: 'updated', file }
}
