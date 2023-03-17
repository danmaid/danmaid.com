import { SimpleServer } from '../src/SimpleServer'
import fetch, { Headers } from 'node-fetch'

const server = new SimpleServer()
let url: string
beforeAll(async () => (url = `http://localhost:${await server.start()}`))
afterAll(async () => await server.stop())

const headers = new Headers({ 'Content-Type': 'application/json' })
async function post(path: string, payload: unknown) {
  return fetch(url + path, { method: 'POST', headers, body: JSON.stringify(payload) })
}
async function put(path: string, payload: unknown) {
  return fetch(url + path, { method: 'PUT', headers, body: JSON.stringify(payload) })
}
async function del(path: string) {
  return fetch(url + path, { method: 'DELETE', headers })
}
async function get(path: string) {
  return fetch(url + path)
}

let id: string
it("POST / { x: 'x', y: 'y', z: 'z' } -> 201 'xxx'(ID)", async () => {
  const res = await post('/', { x: 'x', y: 'y', z: 'z' })
  expect(res.status).toBe(201)
  const data = await res.json()
  expect(data).toStrictEqual(expect.any(String))
  id = data
})

it("GET /xxx -> 200 { x: 'x', y: 'y', z: 'z' }", async () => {
  const res = await get(`/${id}`)
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toMatchObject({ x: 'x', y: 'y', z: 'z' })
})

it("GET / -> 200 contain({ id: 'xxx' })", async () => {
  const res = await get('/')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toContainEqual(expect.objectContaining({ id }))
})

it("PUT /xxx { x: 'xx', z: 'z', a: 'a' } -> 200", async () => {
  const res = await put(`/${id}`, { x: 'xx', z: 'z', a: 'a' })
  expect(res.status).toBe(200)
})

it("GET /xxx -> 200 { x: 'xx', z: 'z', a: 'a' }", async () => {
  const res = await get(`/${id}`)
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toMatchObject({ x: 'xx', z: 'z', a: 'a' })
})

it('DELETE /xxx -> 200', async () => {
  const res = await del(`/${id}`)
  expect(res.status).toBe(200)
})

it('GET /xxx -> 404', async () => {
  const res = await get(`/${id}`)
  expect(res.status).toBe(404)
})

it('GET / -> 200 not.contain({ id })', async () => {
  const res = await get('/')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).not.toContainEqual(expect.objectContaining({ id }))
})
