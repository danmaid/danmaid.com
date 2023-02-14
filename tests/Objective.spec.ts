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

it("PUT /xy { x: 'x', y: 'y' } -> 200", async () => {
  const res = await put('/xy', { x: 'x', y: 'y' })
  expect(res.status).toBe(200)
})

it("GET /xy.json -> { x: 'x', y: 'y' }", async () => {
  const data = await (await get('/xy.json')).json()
  expect(data).toStrictEqual({ x: 'x', y: 'y' })
})

it("GET /xy -> { x: 'x', y: 'y' }", async () => {
  const data = await (await get('/xy')).json()
  expect(data).toStrictEqual({ x: 'x', y: 'y' })
})

it("PUT /xx/yy { x: 'x', y: 'y' } -> 200", async () => {
  const res = await put('/xx/yy', { x: 'x', y: 'y' })
  expect(res.status).toBe(200)
})

it("GET /xx/yy.json -> { x: 'x', y: 'y' }", async () => {
  const data = await (await get('/xx/yy.json')).json()
  expect(data).toStrictEqual({ x: 'x', y: 'y' })
})

it("GET /xx/yy -> { x: 'x', y: 'y' }", async () => {
  const data = await (await get('/xx/yy')).json()
  expect(data).toStrictEqual({ x: 'x', y: 'y' })
})

it('GET /xx.json -> { yy: {} }', async () => {
  const data = await (await get('/xx.json')).json()
  expect(data).toStrictEqual({ yy: {} })
})

// index
it("GET /xx/index.json -> ['yy']", async () => {
  const data = await (await get('/xx/index.json')).json()
  expect(data).toContain('yy')
})

it("GET /xx/ -> ['yy']", async () => {
  const data = await (await get('/xx/')).json()
  expect(data).toContain('yy')
})

it("GET /xx -> ['yy']", async () => {
  const data = await (await get('/xx')).json()
  expect(data).toContain('yy')
})

it("GET /index.json -> ['xy', 'yy']", async () => {
  const data = await (await get('/index.json')).json()
  expect(data).toContain('xy')
  expect(data).toContain('yy')
})

it("GET / -> ['xy', 'yy']", async () => {
  const data = await (await get('/')).json()
  expect(data).toContain('xy')
  expect(data).toContain('yy')
})
