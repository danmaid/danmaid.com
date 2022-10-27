import { HttpServer } from './http'
import { Core, isObject } from './core'
import fetch from 'node-fetch'

const core = new Core()
const server = new HttpServer(core)
const url = 'http://localhost:8521'
const events: any[] = []
core.on(isObject, (ev) => {
  events.push(ev)
})

beforeAll(async () => {
  await new Promise<void>((r) => server.listen(8521, r))
})
afterAll(async () => {
  await new Promise((r) => server.close(r))
})
afterEach(() => {
  // console.debug(events)
  events.splice(0, events.length)
})

it('listen すること', async () => {
  expect(server.listening).toBe(true)
})

it('response イベントによって結果を送信すること', async () => {
  const request = core.wait((ev) => ev.type === 'request')
  const f = fetch(url)
  const req = await request
  core.emit({ type: 'response', request: req.id })
  const res = await f
  expect(res.ok).toBe(true)
  await core.wait((ev: any) => ev.type === 'disconnected')
})

it('connection created/deleted', async () => {
  const connected = core.wait((ev) => ev.type === 'connected')
  const disconnected = core.wait((ev) => ev.type === 'disconnected')
  const request = core.wait((ev) => ev.type === 'request')
  fetch(url)
  const req = await request
  core.emit({ type: 'response', request: req.id })
  const c = await connected
  const d = await disconnected
  expect(c.id).toBe(d.id)
})

it('status, message, headers によって結果を変更できること', async () => {
  const request = core.wait((ev) => ev.type === 'request')
  const f = fetch(url)
  const req = await request
  core.emit({
    type: 'response',
    request: req.id,
    status: 201,
    message: 'test',
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await f
  expect(res.ok).toBe(true)
  expect(res.status).toBe(201)
  expect(res.statusText).toBe('test')
  expect(res.headers.get('Content-Type')).toBe('application/json')
  await core.wait((ev: any) => ev.type === 'disconnected')
})
