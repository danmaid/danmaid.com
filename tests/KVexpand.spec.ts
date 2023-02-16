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
async function del(path: string) {
  return fetch(url + path, { method: 'DELETE', headers })
}

it("PUT /bbb { user: 'bbb', url: '/bbb' } -> 201", async () => {
  const res = await put('/bbb', { user: 'bbb', url: '/bbb' })
  expect(res.status).toBe(201)
})

it('GET /user/bbb -> 200 {}', async () => {
  const res = await get('/user/bbb')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toMatchObject({})
})

it('GET /url/%2Fbbb -> 200 {}', async () => {
  const res = await get('/url/%2Fbbb')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toMatchObject({})
})

it("GET /user/ -> 200 ['bbb']", async () => {
  const res = await get('/user/')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toStrictEqual(['bbb'])
})

it("GET /url/ -> 200 ['%2Fbbb']", async () => {
  const res = await get('/url/')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toStrictEqual(['%2Fbbb'])
})

it("GET / -> 200 ['bbb', 'user', 'url']", async () => {
  const res = await get('/')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toStrictEqual(['bbb', 'user', 'url'])
})

it('DELETE /bbb -> 200', async () => {
  const res = await del('/bbb')
  expect(res.status).toBe(200)
})

it('GET /user/bbb -> 404', async () => {
  const res = await get('/user/bbb')
  expect(res.status).toBe(404)
})

it('GET /url/%2Fbbb -> 404', async () => {
  const res = await get('/url/%2Fbbb')
  expect(res.status).toBe(404)
})

it('GET /user/ -> 404', async () => {
  const res = await get('/user/')
  expect(res.status).toBe(404)
})

it('GET /url/ -> 404', async () => {
  const res = await get('/url/')
  expect(res.status).toBe(404)
})

it('GET / -> 404', async () => {
  const res = await get('/')
  expect(res.status).toBe(404)
})
