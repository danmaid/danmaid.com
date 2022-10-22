import { core, Event, Listener, resolveAll, Resolver } from './core'
import { getContent, isPathEvent, putContent } from './pathContent'
import { PathEvent } from './pathIndex'
import { RequestEvent, ResponseEvent } from './http'
import { Readable } from 'node:stream'
import { createWriteStream } from 'node:fs'
import { join } from 'node:path'

// All events to store.
core.on<{ content?: Readable | string } & Event>(resolveAll, async (ev) => {
  if (ev.content instanceof Readable) {
    const src = ev.content
    const file = join('data/events', ev.id)
    const writer = createWriteStream(file)
    ev.content = file
    src.pipe(writer)
    await new Promise((r) => writer.once('close', r))
    core.emit({ type: 'stored', content: ev.id, file } as any)
  }
})

// // pathIndex
// core.on(canIndex, createOrUpdateIndex)
// core.on<PathEvent>((ev) => typeof ev.path === 'string' && ev.type === 'request', getIndex)

// pathContent
core.on((ev) => isPathEvent(ev) && ev.type === 'request' && (ev as any).method === 'GET', getContent)
core.on<PathEvent & RequestEvent>(
  (ev) => isPathEvent(ev) && ev.type === 'request' && (ev as any).method === 'PUT' && (ev as any).content,
  async (ev) => {
    putContent(ev)
    await core.wait<PathEvent & { content: string }>(
      (e) => e.type === 'stored' && e.path === ev.path && e.content === ev.id
    )
    core.emit<ResponseEvent>({ type: 'response', request: ev.request, status: 200 })
  }
)

// Request -> Error Response
core.on<RequestEvent>(
  (ev) => ev.type === 'request' && typeof ev.request === 'string',
  (ev) => {
    const id = ev.request
    const resolver: Resolver<ErrorEvent> = (ev) => ev.type === 'error' && ev.request === id
    const listener: Listener<ErrorEvent> = (ev) => {
      core.emit<ResponseEvent>({ ...ev, type: 'response', status: 404 })
      core.off(resolver, listener)
    }
    type ErrorEvent = { type: 'error'; request: string } & Event
    core.on(resolver, listener)
  }
)
