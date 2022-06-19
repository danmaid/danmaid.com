import { server } from '../src/index'
import { checkListening } from './utils'
import fetch, { Headers } from 'node-fetch'
import WebSocket from 'ws'

afterAll(async () => {
  ws?.close()
  server.close()
})

it('TCP:8520 で待ち受けること', async () => {
  await expect(checkListening(8520)).resolves.toBe(false)
  server.listen(8520)
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

const event = { test: 'test' }
it('PUT / でイベントを登録できること', async () => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const body = JSON.stringify(event)
  const res = await fetch('http://localhost:8520', { method: 'PUT', headers, body })
  expect(res.status).toBe(200)
})

it('WebSocket 経由でイベントを受信できること', async () => {
  expect(messages).toContainEqual(event)
})

it('GET / でイベントを取得できること', async () => {
  const res = await fetch('http://localhost:8520')
  expect(res.status).toBe(200)
  await expect(res.json()).resolves.toContainEqual(event)
})
