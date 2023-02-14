import { Server } from '../src/Server'
import fetch, { Headers } from 'node-fetch'
import { rm } from 'node:fs/promises'

const server = new Server()
let url: string
beforeAll(async () => {
  await rm('./data', { recursive: true }).catch(() => {})
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

it("GET /user -> ['bbb', 'ccc']", async () => {
  const data = await (await get('/user')).json()
  expect(data).toStrictEqual(['bbb', 'ccc'])
})

it('GET /user/bbb -> {}', async () => {
  const data = await (await get('/user/bbb')).json()
  expect(data).toStrictEqual({})
})

it('GET /user/ccc -> {}', async () => {
  const data = await (await get('/user/ccc')).json()
  expect(data).toStrictEqual({})
})

it("GET /url -> ['/bbb', '/ccc']", async () => {
  const data = await (await get('/url')).json()
  expect(data).toStrictEqual(['/bbb', '/ccc'])
})

it('GET /url/%2Fbbb -> {}', async () => {
  const data = await (await get('/url/%2Fbbb')).json()
  expect(data).toStrictEqual({})
})

it('GET /url/%2Fccc -> {}', async () => {
  const data = await (await get('/url/%2Fccc')).json()
  expect(data).toStrictEqual({})
})

it("GET /bbb -> { user: 'bbb', url: '/bbb' }", async () => {
  const data = await (await get('/bbb')).json()
  expect(data).toStrictEqual({ user: 'bbb', url: '/bbb' })
})

it("GET /ccc -> { user: 'ccc', url: '/ccc' }", async () => {
  const data = await (await get('/ccc')).json()
  expect(data).toStrictEqual({ user: 'ccc', url: '/ccc' })
})

it("GET / -> ['bbb', 'user', 'url', 'ccc']", async () => {
  const data = await (await get('/')).json()
  expect(data).toStrictEqual(['bbb', 'user', 'url', 'ccc'])
})
