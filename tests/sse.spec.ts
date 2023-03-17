import { SimpleServer } from '../src/SimpleServer'
import EventSource from 'eventsource'

const server = new SimpleServer()
let url: string
beforeAll(async () => (url = `http://localhost:${await server.start()}`))
afterAll(async () => await server.stop())

it("new EventSource('/')", async () => {
  const src = new EventSource(url)
  expect(src.readyState).toBe(EventSource.CONNECTING)
  await new Promise((r) => (src.onopen = r))
  expect(src.readyState).toBe(EventSource.OPEN)
  src.close()
  expect(src.readyState).toBe(EventSource.CLOSED)
})
