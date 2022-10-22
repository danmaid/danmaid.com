import { core, Event } from './core'
import { PathEvent } from './pathIndex'
import { dirname, join } from 'node:path'
import { mkdir, access, stat, rm, link } from 'node:fs/promises'
import { createReadStream, constants } from 'node:fs'

export function isPathEvent(ev: Partial<PathEvent>): ev is PathEvent {
  if (typeof ev.path !== 'string') return false
  return true
}

export async function getContent(ev: PathEvent & { request: string }): Promise<unknown> {
  try {
    const file = join('data', ev.path)
    await access(file, constants.R_OK)
    const info = await stat(file)
    const content = createReadStream(file)
    const result = { ...ev, type: 'response', ...info, content }
    core.emit(result)
    return result
  } catch (error) {
    type T = { error: unknown; request: string } & Event
    core.emit<T>({ type: 'error', request: ev.request, ...(error as any) })
  }
}

export async function putContent(ev: PathEvent) {
  try {
    const src = (await core.wait(
      (e: any) => e.type === 'stored' && e.content === ev.id && typeof e.file === 'string'
    )) as any
    console.log('putContent', src.file)
    const file = join('data', ev.path)
    await access(file)
      .then(() => rm(file))
      .catch(() => mkdir(dirname(file), { recursive: true }))
    await link(src.file, file)
    type T = { content: string; path: string } & Event
    core.emit<T>({ type: 'stored', content: ev.id, path: ev.path })
  } catch (err) {
    console.error(err)
  }
}
