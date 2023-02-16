import { Server } from '../src/Server'
import fetch, { Headers } from 'node-fetch'

const server = new Server()
let url: string
beforeAll(async () => (url = `http://localhost:${await server.start()}`))
afterAll(async () => await server.stop())

const headers = new Headers({ 'Content-Type': 'application/json' })
async function put(path: string, payload: unknown) {
  return fetch(url + path, { method: 'PUT', headers, body: JSON.stringify(payload) })
}
async function get(path: string) {
  return fetch(url + path)
}

it('GET /xxx/yyy/ -> 404', async () => {
  const res = await get('/xxx/yyy/')
  expect(res.status).toBe(404)
})

it('GET /xxx/ -> 404', async () => {
  const res = await get('/xxx/')
  expect(res.status).toBe(404)
})

it('GET / -> 404', async () => {
  const res = await get('/')
  expect(res.status).toBe(404)
})

it("PUT /xxx/yyy/zzz { x: 'x', y: 'y', z: 'z' } -> 201", async () => {
  const res = await put('/xxx/yyy/zzz', { x: 'x', y: 'y', z: 'z' })
  expect(res.status).toBe(201)
})

it("GET /xxx/yyy/ -> 200 contain('zzz')", async () => {
  const res = await get('/xxx/yyy/')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toContain('zzz')
})

it("GET /xxx/ -> 200 contain('yyy')", async () => {
  const res = await get('/xxx/')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toContain('yyy')
})

it("GET / -> 200 contain('xxx')", async () => {
  const res = await get('/')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toContain('xxx')
})
