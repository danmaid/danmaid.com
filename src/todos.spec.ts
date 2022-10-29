import { getUrl, startServer } from '../tests/utils'
import { Server } from 'node:http'
import fetch from 'node-fetch'

const todo = { title: 'xxx' }

describe('データが永続化されていること', () => {
  let id: string
  let url1: string
  let url2: string

  jest.isolateModules(() => {
    const { todos } = require('./todos')
    const app = require('express')()
    app.use(todos)
    const server = new Server(app)
    startServer(server)

    beforeAll(() => (url1 = getUrl(server.address())))
  })
  jest.isolateModules(() => {
    const { todos } = require('./todos')
    const app = require('express')()
    app.use(todos)
    const server = new Server(app)
    startServer(server)

    beforeAll(() => (url2 = getUrl(server.address())))
  })

  it('サーバインスタンス1 でデータを投入すること', async () => {
    const res = await fetch(url1 + '/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(todo),
    })
    id = await res.json()
    expect(id).toStrictEqual(expect.any(String))
  })

  it('サーバインスタンス1 でデータが取得できること', async () => {
    const res = await fetch(url1 + `/todos/${id}`, { headers: { accept: 'application/json' } })
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data).toMatchObject(todo)
  })

  it('サーバインスタンス2 でデータが取得できること', async () => {
    const res = await fetch(url2 + `/todos/${id}`, { headers: { accept: 'application/json' } })
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data).toMatchObject(todo)
  })
})
