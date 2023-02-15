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
async function post(path: string, payload: unknown) {
  return fetch(url + path, { method: 'POST', headers, body: JSON.stringify(payload) })
}
async function put(path: string, payload: unknown) {
  return fetch(url + path, { method: 'PUT', headers, body: JSON.stringify(payload) })
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

it("GET / -> 200 contain('xxx')", async () => {
  const res = await get('/')
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data).toContain(id)
})

it.todo("PUT /xxx { x: 'xx', z: 'z', a: 'a' } -> 200")
it.todo("GET /xxx -> 200 { x: 'xx', z: 'z', a: 'a' }")
it.todo("GET / -> 200 ['xxx', 'x', 'z', 'a']")
it.todo("PATCH /xxx { z: 'zz', b: 'b' } -> 200")
it.todo("GET /xxx -> 200 { x: 'xx', z: 'zz', a: 'a', b: 'b' }")
it.todo("GET / -> 200 ['xxx', 'x', 'z', 'a', 'b']")
it.todo('DELETE /xxx -> 200')
it.todo('GET /xxx -> 404')
it.todo('GET / -> 200 []')

it.todo("PUT /yyy { x: 'x', y: 'y', z: 'z' } -> 201")
it.todo("GET / -> 200 ['yyy']")
