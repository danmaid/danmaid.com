import fetch from 'node-fetch'
import { ResponseEvent, server } from './http'
import { events } from './events'

events.on('event', (ev) => {
  if (ev.type !== 'request') return
  const event: ResponseEvent = {
    type: 'response',
    id: ev.id,
    status: 200,
  }
  events.add(event)
})

let url: string
beforeAll(async () => {
  const addr = server.address()
  if (addr && typeof addr === 'object') {
    const host = /6/.test(addr.family) ? `[${addr.address}]` : addr.address
    url = `http://${host}:${addr.port}`
  }
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
