import fetch from 'node-fetch'
import { Server } from '../src'
import { getUrl, startServer } from './utils'

const server = new Server()
startServer(server)

let url: string
beforeAll(async () => (url = getUrl(server.address())))

describe('基本操作', () => {
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
    expect(res.status).toBe(201)
    expect(res.ok).toBe(true)
    expect(res.headers.get('Content-Type')).toMatch('json')
    id = await res.json()
    expect(id).toStrictEqual(expect.any(String))
  })

  it('GET /todos/:id -> 200 todo', async () => {
    const res = await fetch(url + `/todos/${id}`, { headers: { accept: 'application/json' } })
    expect(res.status).toBe(200)
    expect(res.ok).toBe(true)
    expect(res.headers.get('Content-Type')).toMatch('json')
    const data = await res.json()
    expect(data).toMatchObject(todo)
  })

  it('GET /todos -> 200 contain({id}) contain(todo)', async () => {
    const res = await fetch(url + '/todos', { headers: { accept: 'application/json' } })
    expect(res.status).toBe(200)
    expect(res.ok).toBe(true)
    expect(res.headers.get('Content-Type')).toMatch('json')
    const data = await res.json()
    expect(data).toContainEqual(expect.objectContaining({ ...todo, id }))
  })

  it('PATCH /todos/:id -> 200', async () => {
    const res = await fetch(url + `/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'doing' }),
    })
    expect(res.status).toBe(200)
    expect(res.ok).toBe(true)
  })

  it('DELETE /todos/:id -> 200', async () => {
    const res = await fetch(url + `/todos/${id}`, { method: 'DELETE' })
    expect(res.status).toBe(200)
    expect(res.ok).toBe(true)
  })

  it('GET /todos -> 200 !contain({id}) !contain(todo)', async () => {
    const res = await fetch(url + '/todos', { headers: { accept: 'application/json' } })
    expect(res.status).toBe(200)
    expect(res.ok).toBe(true)
    expect(res.headers.get('Content-Type')).toMatch('json')
    const data = await res.json()
    expect(data).not.toContainEqual(expect.objectContaining({ ...todo, id }))
  })

  it('GET /todos/notfound -> 404', async () => {
    const res = await fetch(url + '/todos/notfound')
    expect(res.status).toBe(404)
    expect(res.ok).toBe(false)
  })

  it('DELETE /todos/notfound -> 404', async () => {
    const res = await fetch(url + '/todos/notfound', { method: 'DELETE' })
    expect(res.status).toBe(404)
    expect(res.ok).toBe(false)
  })

  it('PATCH /todos/notfound -> 404', async () => {
    const res = await fetch(url + '/todos/notfound', { method: 'PATCH' })
    expect(res.status).toBe(404)
    expect(res.ok).toBe(false)
  })
})

describe('データが永続化されていること', () => {
  const todo = { title: 'xxx' }
  let id: string
  let url1: string
  let url2: string

  jest.isolateModules(() => {
    const { todos } = require('../src/todos')
    const app = require('express')()
    app.use(todos)
    const server = new Server(app)
    startServer(server)

    beforeAll(() => (url1 = getUrl(server.address())))
  })
  jest.isolateModules(() => {
    const { todos } = require('../src/todos')
    const app = require('express')()
    app.use(todos)
    const server = new Server(app)
    startServer(server)

    beforeAll(() => (url2 = getUrl(server.address())))
  })

  it('サーバインスタンス1 でデータを投入できること', async () => {
    const res = await fetch(url1 + '/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(todo),
    })
    id = await res.json()
    expect(id).toStrictEqual(expect.any(String))
  })

  it('サーバインスタンス1 でデータを取得できること', async () => {
    const res = await fetch(url1 + `/todos/${id}`, { headers: { accept: 'application/json' } })
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data).toMatchObject(todo)
  })

  it('サーバインスタンス2 でデータを取得できること', async () => {
    const res = await fetch(url2 + `/todos/${id}`, { headers: { accept: 'application/json' } })
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data).toMatchObject(todo)
  })

  it('サーバインスタンス2 でデータを削除できること', async () => {
    const res = await fetch(url2 + `/todos/${id}`, { method: 'DELETE' })
    expect(res.ok).toBe(true)
  })

  it('サーバインスタンス1 でデータを取得できないこと', async () => {
    const res = await fetch(url1 + `/todos/${id}`, { headers: { accept: 'application/json' } })
    expect(res.ok).toBe(false)
  })
})

describe('フィルタ', () => {
  const items: { status?: string }[] = [{}, { status: 'doing' }, { status: 'pause' }, { status: 'done' }]
  let ids: string[]
  beforeAll(async () => {
    const create = async (v: { status?: string }): Promise<string> => {
      const res = await fetch(url + '/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...v, key: 'filter' }),
      })
      return await res.json()
    }
    ids = await Promise.all(items.map(create))
  })
  afterAll(async () => {
    await Promise.all(ids.map(async (id) => fetch(url + `/todos/${id}`, { method: 'DELETE' })))
  })

  it('GET /todos', async () => {
    const res = await fetch(url + '/todos?key=filter', { headers: { accept: 'application/json' } })
    expect(res.status).toBe(200)
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data).toHaveLength(4)
  })

  it('GET /todos?status=!done', async () => {
    const res = await fetch(url + '/todos?status=!done&key=filter', { headers: { accept: 'application/json' } })
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data).toHaveLength(3)
  })

  it('GET /todos?status=doing', async () => {
    const res = await fetch(url + '/todos?status=doing&key=filter', { headers: { accept: 'application/json' } })
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data).toHaveLength(1)
  })
})

describe('コメント', () => {
  let id: string | undefined
  beforeAll(async () => {
    const res = await fetch(url + '/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'test' }),
    })
    expect(res.ok).toBe(true)
    id = await res.json()
  })
  afterAll(async () => {
    const res = await fetch(url + `/todos/${id}`, { method: 'DELETE' })
    expect(res.ok).toBe(true)
  })

  it('POST /todos/:id/comments', async () => {
    const res = await fetch(url + `/todos/${id}/comments`, { method: 'POST', body: 'comment' })
    expect(res.status).toBe(200)
    expect(res.ok).toBe(true)
  })

  it('GET /todos/:id -> todo with comment', async () => {
    const res = await fetch(url + `/todos/${id}`, { headers: { accept: 'application/json' } })
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data).toMatchObject({ comments: ['comment'] })
  })

  it('POST /todos/notfound/comments', async () => {
    const res = await fetch(url + '/todos/notfound/comments', { method: 'POST', body: 'comment' })
    expect(res.status).toBe(404)
    expect(res.ok).toBe(false)
  })
})

describe('イベント', () => {
  let id: string | undefined
  beforeAll(async () => {
    const res = await fetch(url + '/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'test' }),
    })
    id = await res.json()
    await fetch(url + `/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'doing' }),
    })
    await fetch(url + `/todos/${id}/comments`, { method: 'POST', body: 'comment' })
    await fetch(url + `/todos/${id}`, { method: 'DELETE' })
  })

  it('Date 判定', async () => {
    expect(!!new Date().getTime()).toBe(true)
    expect(!!new Date('').getTime()).toBe(false)
    expect(!!new Date('invalid').getTime()).toBe(false)
    expect(!!new Date(111).getTime()).toBe(true)
    expect(!!new Date(new Date().toISOString()).getTime()).toBe(true)
  })

  it('GET /todos/:id/events', async () => {
    const res = await fetch(url + `/todos/${id}/events`, { headers: { accept: 'application/json' } })
    expect(res.status).toBe(200)
    expect(res.ok).toBe(true)
    const data: Record<string, unknown>[] = await res.json()
    expect(data).toStrictEqual([
      expect.objectContaining({ path: expect.stringMatching(/^\/todos/), id, type: 'created', title: 'test' }),
      expect.objectContaining({ path: expect.stringMatching(/^\/todos/), id, type: 'updated', status: 'doing' }),
      expect.objectContaining({ path: expect.stringMatching(/^\/todos/), id, type: 'updated', comments: ['comment'] }),
      expect.objectContaining({ path: expect.stringMatching(/^\/todos/), id, type: 'deleted' }),
    ])
  })
})
