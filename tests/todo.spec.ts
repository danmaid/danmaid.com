import fetch from 'node-fetch'
import EventSource from 'eventsource'
import { server } from '../src/http'

let url: string
let sse: EventSource
const events: any[] = []
beforeAll(async () => {
  const addr = server.address()
  if (addr && typeof addr === 'object') {
    const host = /6/.test(addr.family) ? `[${addr.address}]` : addr.address
    url = `http://${host}:${addr.port}`
  }
})

afterAll(async () => {
  console.log(events)
  sse.close()
  server.close()
})

it('SSE', async () => {
  sse = new EventSource(url)
  const events: any[] = []
  sse.onmessage = (ev) => events.push(JSON.parse(ev.data))
  await expect(new Promise((r) => (sse.onopen = r))).resolves.toBeTruthy()
  expect(events).toContainEqual(
    expect.objectContaining({
      type: 'chunked',
      status: 200,
    })
  )
})

it('PUT /todo/xxx', async () => {
  const events: any[] = []
  sse.onmessage = (ev) => events.push(JSON.parse(ev.data))
  const body = JSON.stringify({ title: 'test' })
  const res = await fetch(url + '/todo/xxx', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  expect(res.status).toBe(200)
  expect(events).toContainEqual(
    expect.objectContaining({
      type: 'request',
      url: '/todo/xxx',
      method: 'PUT',
      'content-type': 'application/json',
    })
  )
})

it('GET /todo/xxx', async () => {
  const events: any[] = []
  sse.onmessage = (ev) => events.push(JSON.parse(ev.data))
  const res = await fetch(url + '/todo/xxx')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toStrictEqual({ title: 'test' })
  expect(events).toContainEqual(
    expect.objectContaining({
      type: 'request',
      url: '/todo/xxx',
      method: 'GET',
    })
  )
})
