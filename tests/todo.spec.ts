import fetch from 'node-fetch'
import { server } from '../src'
import { core } from '../src/core'

const events: any[] = []
let url: string
beforeAll(async () => {
  const addr = server.address()
  if (addr && typeof addr === 'object') {
    const host = /6/.test(addr.family) ? `[${addr.address}]` : addr.address
    url = `http://${host}:${addr.port}`
  }
  core.on(
    () => true,
    (ev) => {
      events.push(ev)
    }
  )
})

afterAll(async () => {
  server.close()
  console.debug(events)
})

it('PUT /todo/xxx', async () => {
  const body = JSON.stringify({ title: 'test' })
  const res = await fetch(url + '/todo/xxx', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  expect(res.status).toBe(200)
})

it.skip('GET /todo/xxx', async () => {
  const res = await fetch(url + '/todo/xxx')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toBeInstanceOf(Array)
  expect(data.length).toBeGreaterThan(0)
})
