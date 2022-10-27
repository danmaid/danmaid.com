import fetch from 'node-fetch'
import { server, core } from '../src'
import { isObject } from '../src/core'

let url: string
const events: any[] = []

beforeAll(async () => {
  core.on(isObject, (ev) => {
    events.push(ev)
  })
  await new Promise<void>((r) => server.listen(r))
  const addr = server.address()
  if (addr && typeof addr === 'object') {
    const host = /6/.test(addr.family) ? `[${addr.address}]` : addr.address
    url = `http://${host}:${addr.port}`
  }
})
afterAll(async () => {
  await new Promise((r) => server.close(r))
})
afterEach(() => {
  console.debug(events)
  events.splice(0, events.length)
})

// it('POST { tags: ["todo"], title: "test" } => 201, EventId', async () => {
//   const res = await fetch(url, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(todo),
//   })
//   expect(res.status).toBe(201)
//   id = await res.text()
//   expect(id).toMatch(/^[\w-]+$/)
//   // await new Promise((r) => sse.addEventListener('message', r))
// })

// it('GET /{id}', async () => {
//   const res = await fetch(new URL(`/${id}`, url))
//   expect(res.status).toBe(200)
//   const data = await res.json()
//   expect(data).toStrictEqual(todo)
//   // await new Promise((r) => sse.addEventListener('message', r))
// })

it('GET /todo/yyy -> 404', async () => {
  const res = await fetch(new URL('/todo/yyy', url))
  expect(res.ok).toBe(false)
  expect(res.status).toBe(404)
  await core.wait((ev: any) => ev.type === 'disconnected')
})

const body = JSON.stringify({ title: 'PUT /todo/xxx' })
it('PUT /todo/xxx', async () => {
  const res = await fetch(new URL('/todo/xxx', url), {
    method: 'PUT',
    body,
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.ok).toBe(true)
  expect(res.status).toBe(200)
  await core.wait((ev: any) => ev.type === 'disconnected')
})

it('GET /todo/xxx -> 200', async () => {
  const res = await fetch(new URL('/todo/xxx', url))
  expect(res.ok).toBe(true)
  expect(res.status).toBe(200)
  expect(res.headers.get('Content-Length')).toBe(body.length.toString())
  expect(res.headers.get('Content-Type')).toBe('application/json')
  const text = await res.text()
  expect(text).toBe(body)
  await core.wait((ev: any) => ev.type === 'disconnected')
})

it('GET /todo', async () => {
  const res = await fetch(new URL('/todo', url))
  expect(res.ok).toBe(true)
  expect(res.status).toBe(200)
  expect(res.headers.get('Content-Length')).toBe(body.length.toString())
  expect(res.headers.get('Content-Type')).toBe('application/json')
  const text = await res.text()
  expect(text).toBe(body)
  await core.wait((ev: any) => ev.type === 'disconnected')
})
