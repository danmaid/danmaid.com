import fetch, { FetchError } from 'node-fetch'
import { connectSSE } from './core.spec'

interface Todo {
  tags: ['todo']
}

const url: string = (globalThis as any).__URL__
const sse = connectSSE()

const todo = { tags: ['todo'], title: 'test' }
let id: string

it('POST { tags: ["todo"], title: "test" } => 201, EventId', async () => {
  const events: any[] = []
  sse.onmessage = (ev) => events.push(JSON.parse(ev.data))
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(todo),
  })
  expect(res.status).toBe(201)
  id = await res.text()
  expect(id).toMatch(/^[\w-]+$/)
  await new Promise((r) => sse.addEventListener('message', r))
  expect(events).toContainEqual(
    expect.objectContaining({
      type: 'request',
      url: '/',
      method: 'POST',
      'content-type': 'application/json',
    })
  )
})

it('GET /todo', async () => {
  const events: any[] = []
  sse.onmessage = (ev) => events.push(JSON.parse(ev.data))
  const res = await fetch(new URL('/todo', url))
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toBeInstanceOf(Array)
  expect(data).toContainEqual(todo)
})

it('GET /todo/{id}', async () => {
  const events: any[] = []
  sse.onmessage = (ev) => events.push(JSON.parse(ev.data))
  const res = await fetch(new URL(`/todo/${id}`, url))
  // expect(res.status).toBe(200)
  // const data = await res.json()
  // expect(data).toStrictEqual({ title: 'test' })
  // await new Promise((r) => sse.addEventListener('message', r))
  expect(events).toContainEqual(
    expect.objectContaining({
      type: 'request',
      url: '/todo/xxx',
      method: 'GET',
    })
  )
})
