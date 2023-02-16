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

it("PUT /xy { x: 'x', y: 'y' } -> 201", async () => {
  const res = await put('/xy', { x: 'x', y: 'y' })
  expect(res.status).toBe(201)
})

it("GET /xy -> 200 { x: 'x', y: 'y' }", async () => {
  const res = await get('/xy')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toMatchObject({ x: 'x', y: 'y' })
})

it("PUT /xx/yy { x: 'x', y: 'y' } -> 201", async () => {
  const res = await put('/xx/yy', { x: 'x', y: 'y' })
  expect(res.status).toBe(201)
})

it("GET /xx/yy -> 200 { x: 'x', y: 'y' }", async () => {
  const res = await get('/xx/yy')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toMatchObject({ x: 'x', y: 'y' })
})

it("GET /xx/ -> 200 ['yy']", async () => {
  const res = await get('/xx/')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toStrictEqual(['yy'])
})
