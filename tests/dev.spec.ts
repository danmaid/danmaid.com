import { server } from '../src/dev'
import { checkListening } from './utils'
import fetch, { Headers } from 'node-fetch'

afterAll(async () => {
  await new Promise((r) => server.close(r))
})

it('TCP:8521 で待ち受けること', async () => {
  await expect(checkListening(8521)).resolves.toBe(true)
})

const event = { test: 'test' }
it('PUT / でイベントを登録できること', async () => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const body = JSON.stringify(event)
  const res = await fetch('http://localhost:8521', { method: 'PUT', headers, body })
  expect(res.status).toBe(200)
})

it('GET / with Accept: application/json でイベントを取得できること', async () => {
  const headers = new Headers({ Accept: 'application/json' })
  const res = await fetch('http://localhost:8521', { headers })
  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toBe('application/json')
  await expect(res.json()).resolves.toContainEqual(event)
})

it('GET / で HTML コンテンツを取得できること', async () => {
  const res = await fetch('http://localhost:8521')
  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toBe('text/html')
})
