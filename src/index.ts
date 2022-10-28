import { Core } from './core'
import { HttpServer, isRequestEvent, RequestEvent, ResponseEvent } from './http'
import { mkdirSync } from 'node:fs'
import { FileIndex } from './FileIndex'
import { FileStore, isSavedEvent, LoadEvent, SaveEvent } from './FileStore'

export const core = new Core()

const dataDir = './data'
mkdirSync(dataDir, { recursive: true })

core.on(
  (ev) => isRequestEvent(ev) && 'content' in ev,
  // @ts-ignore
  async (ev: RequestEvent & Required<Pick<RequestEvent, 'content'>>) => {
    const { request } = ev
    const event = { ...ev }
    core.emit<SaveEvent>({ ...event, type: 'save' })
    const res = await core.wait((ev) => isSavedEvent(ev) && (ev as any).request === request)
    core.emit({ ...res, type: 'response', status: 200 })
  }
)

core.on(
  (ev) => isRequestEvent(ev) && ev.method === 'GET',
  // @ts-ignore
  async (ev: RequestEvent) => {
    const { request } = ev
    const event = { ...ev }
    core.emit<LoadEvent>({ ...event, type: 'load' })
    const [{ content }, index]: any[] = await Promise.all([
      core.wait((ev: any) => ev.type === 'loaded' && ev.request === request && 'content' in ev),
      core.wait((ev: any) => ev.type === 'loaded' && ev.request === request && 'content-length' in ev),
    ])
    const headers = {
      'content-type': index['content-type'],
      'content-length': index['content-length'],
    }
    core.emit<ResponseEvent>({ ...event, type: 'response', status: 200, headers, content })
  }
)

new FileStore(core)
new FileIndex(core)

export const server = new HttpServer(core)
export default server
