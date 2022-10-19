import fetch from 'node-fetch'
import { ConnectionEvent, RequestEvent, ResponseEvent, server } from './http'
import { core } from './core'

// for debug
const events: any[] = []
let url: string
beforeAll(async () => {
  const addr = server.address()
  if (addr && typeof addr === 'object') {
    const host = /6/.test(addr.family) ? `[${addr.address}]` : addr.address
    url = `http://${host}:${addr.port}`
  }

  core.on<RequestEvent>(
    (ev) => ev.type === 'request',
    (ev) => {
      core.emit<ResponseEvent>({
        type: 'response',
        response: { status: 200, content: 'data' },
        request: typeof ev.request === 'string' ? ev.request : ev.request.id,
      })
    }
  )
  // for debug
  core.on(
    () => true,
    (ev) => {
      // console.log(ev)
      events.push(ev)
    }
  )
})
afterAll(async () => {
  server.close()
})

it('listen すること', async () => {
  expect(server.listening).toBe(true)
})

it('', async () => {
  await fetch(url, { method: 'POST', body: 'hoge' })
  const res = await fetch(url)
  expect(res.status).toBe(200)
  await core.wait<ConnectionEvent>((ev) => ev.type === 'disconnected')
})

it('connection created/deleted', async () => {
  const created = core.wait<ConnectionEvent>((ev) => ev.type === 'connected')
  const deleted = core.wait<ConnectionEvent>((ev) => ev.type === 'disconnected')
  await fetch(url)
  const c: any = await created
  const d = await deleted
  expect(c.connection.id).toBe(d.connection)
})

it('request created/deleted', async () => {
  const opened = core.wait<RequestEvent>((ev) => ev.type === 'request')
  const closed = core.wait<RequestEvent>((ev) => ev.type === 'responded')
  const res = await fetch(url)
  const c: any = await opened
  const d = await closed
  expect(c.request.id).toBe(d.request)
  await expect(res.text()).resolves.toBe('data')
  core.wait<ConnectionEvent>((ev) => ev.type === 'disconnected')
})

it.only('POST with content', async () => {
  const opened = core.wait<RequestEvent>((ev) => ev.type === 'request')
  const closed = core.wait<RequestEvent>((ev) => ev.type === 'responded')
  const res = await fetch(url, { method: 'POST', body: 'hoge' })
  const c: any = await opened
  const d = await closed
  expect(c.request.id).toBe(d.request)
  await expect(res.text()).resolves.toBe('data')
  // for debug
  await new Promise((r) => setTimeout(r, 1000))
  console.log(events)
  core.wait<ConnectionEvent>((ev) => ev.type === 'disconnected')
})
