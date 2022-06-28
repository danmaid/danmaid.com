import { server } from '../src/index'
import { checkListening } from './utils'
import fetch, { Headers } from 'node-fetch'
import WebSocket from 'ws'
import { RequestHandler } from 'express'

jest.mock('morgan', () => (): RequestHandler => (req, res, next) => next())

beforeAll(async () => {
  console.log = jest.fn()
})

afterAll(async () => {
  ws?.close()
  server.close()
})

it('TCP:8520 で待ち受けること', async () => {
  await expect(checkListening(8520)).resolves.toBe(true)
})

let ws: WebSocket
const messages: any[] = []
it('WebSocket で接続できること', async () => {
  ws = new WebSocket('ws://localhost:8520')
  await new Promise((r) => ws.on('open', r))
  expect(ws.readyState).toBe(WebSocket.OPEN)
  ws.on('message', (data) => messages.push(JSON.parse(data.toString())))
})

const item = { test: 'test' }
it('PUT /hoge/fuga でアイテムを登録できること', async () => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const body = JSON.stringify(item)
  const res = await fetch('http://localhost:8520/hoge/fuga', { method: 'PUT', headers, body })
  expect(res.status).toBe(200)
})

it('WebSocket 経由でイベントを受信できること', async () => {
  expect(messages).toContainEqual({ body: item, path: '/hoge/fuga' })
})

it('GET /.json で一覧を取得できること', async () => {
  const res = await fetch('http://localhost:8520/.json')
  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toMatch('application/json')
  const data = await res.json()
  expect(data).toBeInstanceOf(Array)
  expect(data).toContainEqual(item)
})

it('GET /index.json で一覧を取得できること', async () => {
  const res = await fetch('http://localhost:8520/index.json')
  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toMatch('application/json')
  const data = await res.json()
  expect(data).toBeInstanceOf(Array)
  expect(data).toContainEqual(item)
})

it('GET /hoge/fuga.json で /hoge/fuga アイテムを取得できること', async () => {
  const res = await fetch('http://localhost:8520/hoge/fuga.json')
  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toMatch('application/json')
  const data = await res.json()
  expect(data).toStrictEqual(item)
})

it('GET で HTML コンテンツを取得できること', async () => {
  const res = await fetch('http://localhost:8520')
  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toMatch('text/html')
})

it('PATCH で既存データの一部を変更できること', async () => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const body = JSON.stringify({ add: 'modified' })
  const res = await fetch('http://localhost:8520/hoge/fuga', { method: 'PATCH', headers, body })
  expect(res.status).toBe(200)

  const get = await fetch('http://localhost:8520/hoge/fuga.json')
  await expect(get.json()).resolves.toStrictEqual({ ...item, add: 'modified' })
})

it('GET /.json?key=value で一覧をフィルタして取得できること', async () => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  await Promise.all([
    fetch('http://localhost:8520/item1', { method: 'PUT', headers, body: JSON.stringify({ links: ['1'] }) }),
    fetch('http://localhost:8520/item2', { method: 'PUT', headers, body: JSON.stringify({ links: ['1', '2'] }) }),
    fetch('http://localhost:8520/item3', { method: 'PUT', headers, body: JSON.stringify({ links: ['3'] }) }),
    fetch('http://localhost:8520/item4', { method: 'PUT', headers, body: JSON.stringify({ links: [] }) }),
    fetch('http://localhost:8520/item5', { method: 'PUT', headers, body: JSON.stringify({}) }),
  ])

  const res = await fetch('http://localhost:8520/.json?links=1')
  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toMatch('application/json')
  const data = await res.json()
  expect(data).toBeInstanceOf(Array)
  expect(data).toHaveLength(2)
  expect(data).toContainEqual({ links: ['1'] })
  expect(data).toContainEqual({ links: ['1', '2'] })
})
