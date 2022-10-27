import { Core } from './core'
import { HttpServer, isRequestEvent, RequestEvent, ResponseEvent } from './http'
import { Readable } from 'node:stream'
import { writeFile, mkdir } from 'node:fs/promises'
import { createReadStream, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { v4 as uuid } from 'uuid'
import { FileIndex } from './FileIndex'

export const core = new Core()
export const server = new HttpServer(core)
export default server

const dataDir = './data'
mkdirSync(dataDir, { recursive: true })

core.on(
  (ev) => isRequestEvent(ev) && ev.method === 'PUT' && 'content' in ev,
  // @ts-ignore
  async (ev: { id: string; path: string; content: Readable }) => {
    const { id, path, content } = ev
    const index = { ...ev, content: '[object Readable]' }
    const file = join(dataDir, path)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, content)
    await new FileIndex(file).set(index)
    core.emit<ResponseEvent>({ type: 'response', id: uuid(), request: id, status: 200 })
  }
)

core.on(
  (ev) => isRequestEvent(ev) && ev.method === 'GET',
  // @ts-ignore
  async (ev: { id: string; path: string }) => {
    const { id, path } = ev
    const response: Pick<ResponseEvent, 'type' | 'id' | 'request'> = { type: 'response', id: uuid(), request: id }
    try {
      const file = join(dataDir, path)
      const index = await new FileIndex<RequestEvent>(file).get()
      const content = createReadStream(file)
      const headers = {
        'Content-Length': index.headers['content-length'],
        'Content-Type': index.headers['content-type'],
      }
      core.emit<ResponseEvent>({ ...response, status: 200, headers, content })
    } catch {
      core.emit<ResponseEvent>({ ...response, status: 404 })
    }
  }
)
