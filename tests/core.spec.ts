import { server } from '../src'
import EventSource from 'eventsource'
import fetch from 'node-fetch'

let url: string
let sse: EventSource

beforeAll(async () => {
  const addr = server.address()
  if (addr && typeof addr === 'object') {
    const host = /6/.test(addr.family) ? `[${addr.address}]` : addr.address
    url = `http://${host}:${addr.port}`
  }
})

afterAll(async () => {
  sse?.close()
  server.close()
})

it('EventSource (SSE) で接続できること', async () => {
  sse = new EventSource(url)
  expect(sse.readyState).toBe(EventSource.CONNECTING)
  await expect(new Promise((r) => (sse.onopen = r))).resolves.toBeTruthy()
  expect(sse.readyState).toBe(EventSource.OPEN)
})

it('Request を EventSource に配信すること', async () => {
  const events: any = []
  sse.onmessage = (ev) => events.push(JSON.parse(ev.data))
  await fetch(url)
  expect(events).toContainEqual(
    expect.objectContaining({
      type: 'request',
      id: expect.stringMatching(/^[\w-]+$/),
      url: '/',
      method: 'GET',
    })
  )
})
