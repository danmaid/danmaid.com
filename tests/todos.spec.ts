import fetch from 'node-fetch'
import { Server } from '../src'
import { getUrl, startServer } from './utils'

const server = new Server()
startServer(server)

let url: string
beforeAll(async () => (url = getUrl(server.address())))

it('GET /todos', async () => {
  const res = await fetch(url + '/todos', { headers: { accept: 'application/json' } })
  expect(res.ok).toBe(true)
  expect(res.status).toBe(200)
  expect(res.headers.get('Content-Type')).toMatch('json')
  const data = await res.json()
  expect(data).toBeInstanceOf(Array)
})

const todo = { title: 'test' }
let id: string | undefined
it('POST /todos -> 201 ID', async () => {
  const res = await fetch(url + '/todos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(todo),
  })
  expect(res.ok).toBe(true)
  expect(res.status).toBe(201)
  expect(res.headers.get('Content-Type')).toMatch('json')
  id = await res.json()
  expect(id).toStrictEqual(expect.any(String))
})

it('GET /todos/:id -> 200 todo', async () => {
  const res = await fetch(url + `/todos/${id}`, { headers: { accept: 'application/json' } })
  expect(res.ok).toBe(true)
  expect(res.status).toBe(200)
  expect(res.headers.get('Content-Type')).toMatch('json')
  const data = await res.json()
  expect(data).toMatchObject(todo)
})

it('GET /todos -> 200 contain({id}) contain(todo)', async () => {
  const res = await fetch(url + '/todos', { headers: { accept: 'application/json' } })
  expect(res.ok).toBe(true)
  expect(res.status).toBe(200)
  expect(res.headers.get('Content-Type')).toMatch('json')
  const data = await res.json()
  expect(data).toContainEqual(expect.objectContaining({ id }))
  expect(data).toContainEqual(expect.objectContaining(todo))
})

it('DELETE /todos/:id -> 200', async () => {
  const res = await fetch(url + `/todos/${id}`, { method: 'DELETE' })
  expect(res.ok).toBe(true)
  expect(res.status).toBe(200)
})

it('GET /todos -> 200 !contain({id}) !contain(todo)', async () => {
  const res = await fetch(url + '/todos', { headers: { accept: 'application/json' } })
  expect(res.ok).toBe(true)
  expect(res.status).toBe(200)
  expect(res.headers.get('Content-Type')).toMatch('json')
  const data = await res.json()
  expect(data).not.toContainEqual(expect.objectContaining({ id }))
  expect(data).not.toContainEqual(expect.objectContaining(todo))
})

it('GET /todos/notfound -> 404', async () => {
  const res = await fetch(url + '/todos/notfound')
  expect(res.ok).toBe(false)
  expect(res.status).toBe(404)
})

it('DELETE /todos/notfound -> 404', async () => {
  const res = await fetch(url + '/todos/notfound', { method: 'DELETE' })
  expect(res.ok).toBe(false)
  expect(res.status).toBe(404)
})
