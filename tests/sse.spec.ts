import { Server } from '../src'
import { getUrl, startServer } from './utils'
import EventSource from 'eventsource'

const server = new Server()
startServer(server)

let url: string
beforeAll(async () => (url = getUrl(server.address())))

it("new EventSource('/')", async () => {
  const src = new EventSource(url)
  expect(src.readyState).toBe(EventSource.CONNECTING)
  await new Promise((r) => (src.onopen = r))
  expect(src.readyState).toBe(EventSource.OPEN)
  src.close()
  expect(src.readyState).toBe(EventSource.CLOSED)
})
