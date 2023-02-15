import { Server } from '../src/Server'
import fetch, { Headers } from 'node-fetch'

const server = new Server()
let url: string
beforeAll(async () => {
  const port = await server.start()
  url = `http://localhost:${port}`
})
afterAll(async () => await server.stop())

const headers = new Headers({ 'Content-Type': 'application/json' })
async function put(path: string, payload: unknown) {
  return fetch(url + path, { method: 'PUT', headers, body: JSON.stringify(payload) })
}
async function get(path: string) {
  return fetch(url + path)
}

it("PUT /bbb { user: 'bbb', url: '/bbb' } -> 200", async () => {
  const res = await put('/bbb', { user: 'bbb', url: '/bbb' })
  expect(res.status).toBe(200)
})

it("PUT /ccc { user: 'ccc', url: '/ccc' } -> 200", async () => {
  const res = await put('/ccc', { user: 'ccc', url: '/ccc' })
  expect(res.status).toBe(200)
})

it("GET /user/ -> 200 ['bbb', 'ccc']", async () => {
  const res = await get('/user/')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toStrictEqual(['bbb', 'ccc'])
})

it('GET /user/bbb -> 200 {}', async () => {
  const res = await get('/user/bbb')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toMatchObject({})
})

it('GET /user/ccc -> 200 {}', async () => {
  const res = await get('/user/ccc')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toMatchObject({})
})

it("GET /url/ -> 200 ['%2Fbbb', '%2Fccc']", async () => {
  const res = await get('/url/')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toStrictEqual(['%2Fbbb', '%2Fccc'])
})

it('GET /url/%2Fbbb -> 200 {}', async () => {
  const res = await get('/url/%2Fbbb')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toMatchObject({})
})

it('GET /url/%2Fccc -> 200 {}', async () => {
  const res = await get('/url/%2Fccc')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toMatchObject({})
})

it("GET / -> 200 ['bbb', 'user', 'url', 'ccc']", async () => {
  const res = await get('/')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toStrictEqual(['bbb', 'user', 'url', 'ccc'])
})
