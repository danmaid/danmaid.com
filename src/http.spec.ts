import fetch from 'node-fetch'
import { server } from './http'
import { EventMeta } from './events'
import { core } from './core'

// const events: any[] = []
let url: string
beforeAll(async () => {
  const addr = server.address()
  if (addr && typeof addr === 'object') {
    const host = /6/.test(addr.family) ? `[${addr.address}]` : addr.address
    url = `http://${host}:${addr.port}`
  }

  core.on('request', (m, v) => {
    m.type === 'opened' && core.emit('response', { type: 'send', request: v.id }, { status: 200 })
  })
  // core.on('event', (ev) => events.push(ev))
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
})

it('connection created/deleted', async () => {
  const created = new Promise((r) => core.on('connection', (m) => m.type === 'opened' && r(m)))
  const deleted = new Promise((r) => core.on('connection', (m) => m.type === 'closed' && r(m)))
  await fetch(url)
  const c: any = await created
  const d: any = await deleted
  expect(c.id).toBe(d.id)
})

it('connection created/deleted event', async () => {
  const events: any[] = []
  core.on('event', (e) => events.push(e))
  await fetch(url)
  const deleted = await new Promise<EventMeta>((r) =>
    core.on('event', (e) => e.type === 'closed' && typeof e.connection === 'string' && r(e))
  )
  expect(events).toContainEqual(
    expect.objectContaining({
      type: 'opened',
      connection: expect.objectContaining({
        id: deleted.connection,
      }),
    })
  )
})

it('request created/deleted', async () => {
  const opened = new Promise((r) => core.on('request', (m) => m.type === 'opened' && r(m)))
  const closed = new Promise((r) => core.on('request', (m) => m.type === 'closed' && r(m)))
  await fetch(url)
  const c: any = await opened
  const d: any = await closed
  expect(c.id).toBe(d.id)
  // await new Promise((r) => setTimeout(r, 1000))
  // console.log(events)
})
