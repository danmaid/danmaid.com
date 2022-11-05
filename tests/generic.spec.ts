import fetch from 'node-fetch'
import { Server } from '../src'
import { getUrl, startServer } from './utils'
import EventSource from 'eventsource'

const server = new Server()
startServer(server)

let url: string
beforeAll(async () => (url = getUrl(server.address())))

describe('todo', () => {
  let id: string
  let src: EventSource

  beforeAll(async () => {
    src = new EventSource(url)
    await new Promise((r) => (src.onopen = r))
  })
  afterAll(async () => {
    src.close()
  })

  function waitEvent<T = any>(resolver: (ev: { id: string; date: Date; event: T }) => boolean): Promise<T> {
    return new Promise((resolve) => {
      src.onmessage = (ev) => {
        const event = JSON.parse(ev.data)
        console.log(event)
        if (resolver(event)) resolve(event)
      }
    })
  }

  it('POST /todo { title: "test" } -> 201 ":id"', async () => {
    const wait = waitEvent(({ event }) => typeof event.todo === 'string' && event.type === 'created')
    const res = await fetch(url + `/todo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ title: 'test' }),
    })
    expect(res.status).toBe(201)
    expect(res.ok).toBe(true)
    id = await res.json()
    expect(id).toStrictEqual(expect.any(String))
    await expect(wait).resolves.toMatchObject({ event: { title: 'test', todo: id, type: 'created' } })
  })

  it('GET /todo -> 200 contain({ id: ":id" })', async () => {
    const res = await fetch(url + `/todo`)
    expect(res.status).toBe(200)
    expect(res.ok).toBe(true)
    const list = await res.json()
    expect(list).toContainEqual(expect.objectContaining({ id: id }))
  })

  it('GET /todo/:id -> 200 { title: "test", todo: ":id" }', async () => {
    const res = await fetch(url + `/todo/${id}`)
    expect(res.status).toBe(200)
    expect(res.ok).toBe(true)
    await expect(res.json()).resolves.toStrictEqual({ title: 'test', todo: id })
  })

  it('GET /title -> 200 contain({ id: "test" })', async () => {
    const res = await fetch(url + `/title`)
    expect(res.status).toBe(200)
    expect(res.ok).toBe(true)
    const list = await res.json()
    expect(list).toContainEqual(expect.objectContaining({ id: 'test' }))
  })

  it('GET /title/test -> 200 { title: "test", todo: ":id" }', async () => {
    const res = await fetch(url + `/title/test`)
    expect(res.status).toBe(200)
    expect(res.ok).toBe(true)
    await expect(res.json()).resolves.toStrictEqual({ title: 'test', todo: id })
  })

  it('DELETE /todo/:id -> 200', async () => {
    const wait = waitEvent(({ event }) => typeof event.todo === 'string' && event.type === 'deleted')
    const res = await fetch(url + `/todo/${id}`, { method: 'DELETE' })
    expect(res.status).toBe(200)
    expect(res.ok).toBe(true)
    // // todo: wait event
    // await new Promise((r) => setTimeout(r, 1000))
    await expect(wait).resolves.toMatchObject({ event: { todo: id, type: 'deleted' } })
  })

  it('GET /title/test -> 200 { title: "test" }', async () => {
    const res = await fetch(url + `/title/test`)
    expect(res.status).toBe(200)
    expect(res.ok).toBe(true)
    await expect(res.json()).resolves.toStrictEqual({ title: 'test' })
  })

  it('DELETE /title/test -> 200', async () => {
    const res = await fetch(url + `/title/test`, { method: 'DELETE' })
    expect(res.status).toBe(200)
    expect(res.ok).toBe(true)
    // todo: wait event
    await new Promise((r) => setTimeout(r, 1000))
  })
})
