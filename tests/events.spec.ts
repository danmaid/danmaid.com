import { server } from '../src/index'
import fetch from 'node-fetch'

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

it('GET /events', async () => {
  const res = await fetch(url + '/events')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toBeInstanceOf(Array)
  expect(data.length).toBeGreaterThan(0)
})
