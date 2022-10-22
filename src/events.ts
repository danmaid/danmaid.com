import { appendFile } from 'node:fs/promises'
import { mkdirSync, closeSync, openSync, createWriteStream, createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { dirname, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { Event } from './core'

const dir = 'data/events'
const indexFile = resolve(dir, 'index.jsonl')

mkdirSync(dirname(indexFile), { recursive: true })
closeSync(openSync(indexFile, 'a'))

interface ContentEvent extends Event {
  content?: Readable | string
}

async function appendIndex(ev: ContentEvent): Promise<void> {
  const event = { ...ev }
  if (event.content instanceof Readable) {
    const writer = createWriteStream(resolve(dir, event.id))
    event.content.pipe(writer)
    await new Promise((r) => writer.once('finish', r))
    event.content = '[object Readable]'
  }
  await appendFile(indexFile, JSON.stringify(event) + '\n')
}

export function filter<T>(filter: (meta: T) => boolean): Promise<T[]> {
  return new Promise<T[]>((resolve) => {
    const reader = createInterface(createReadStream(indexFile))
    const items: T[] = []
    reader.on('line', (line) => {
      const event = JSON.parse(line, (k, v) => (k === 'date' ? new Date(v) : v))
      filter(event) && items.push(event)
    })
    reader.on('close', () => resolve(items))
  })
}

export function getContent(id: string): Readable {
  return createReadStream(resolve(dir, id))
}

// core.on(() => true, appendIndex)
// core.on<RequestEvent>(
//   (ev) => ev.type === 'request' && ev.method === 'GET' && ev.path === '/events',
//   async (ev) => {
//     const events = await filter(() => true)
//     core.emit<ResponseEvent>({
//       type: 'response',
//       request: ev.request,
//       status: 200,
//       content: Readable.from(JSON.stringify(events)),
//     })
//   }
// )
