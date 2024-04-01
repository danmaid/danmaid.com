import { afterAll, jest } from '@jest/globals'
import http2, { createServer, Http2Session } from 'node:http2'

export const server = createServer()
const sessions = new Set<Http2Session>()

server.on('session', (session) => {
  session.on('close', () => sessions.delete(session))
  sessions.add(session)
})
server.listen()
const addr = server.address()
if (!addr || typeof addr !== 'object') throw Error()
const port = addr.port

const connect = http2.connect
jest.spyOn(http2, 'connect').mockImplementation((authority, ...args) => {
  if (authority instanceof URL) {
    authority.protocol = 'http'
    authority.host = 'localhost'
    authority.port = String(port)
  }
  return connect(authority, ...args)
})

afterAll(async () => {
  for (const session of sessions) {
    await new Promise<void>(r => session.close(r))
  }
  await new Promise(r => server.close(r))
})
