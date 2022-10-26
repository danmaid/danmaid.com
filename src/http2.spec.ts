import { HttpServer } from './http2'
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
  console.log(events)
  await new Promise((r) => server.close(r))
})

it('listen すること', async () => {
  expect(server.listening).toBe(true)
})

it('connection created/deleted', async () => {
  const created = core.wait((ev) => ev.type === 'connected')
  const deleted = core.wait((ev) => ev.type === 'disconnected')
  fetch(url)
  const req = await core.wait((ev) => ev.type === 'request')
  core.emit({ type: 'response', request: req.id })
  const c = await created
  const d = await deleted
  expect(c.id).toBe(d.id)
})
