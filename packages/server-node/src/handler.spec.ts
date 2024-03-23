import { it, expect, jest } from '@jest/globals'
import { handler } from './handler'
import fs from 'node:fs/promises'
import fss from 'node:fs'
jest.mock('./config', () => ({
  config: { dir: './data' }
}))

class MockRequest {
  constructor(init = {}) {
    Object.assign(this, init)
  }
}
class MockResponse {
  writeHead = jest.fn().mockReturnThis()
  end = jest.fn()
}

it('GET => 200', async () => {
  const req = new MockRequest({ method: 'GET' })
  const res = new MockResponse()
  jest.spyOn(fs, 'stat').mockResolvedValueOnce({
    size: 1234,
    mtime: new Date(1234).getTime(),
    isDirectory: () => false
  } as any)
  const stream = { pipe: jest.fn() }
  jest.spyOn(fss, 'createReadStream').mockReturnValueOnce(stream as any)
  await handler(req as any, res as any)
  expect(res.writeHead).toBeCalledWith(200, expect.objectContaining({
    'Content-Length': 1234,
    'Last-Modified': new Date(1234).toUTCString()
  }))
  expect(stream.pipe).toBeCalledWith(res)
})

it('GET => ENOENT => 404', async () => {
  const req = new MockRequest({ method: 'GET' })
  const res = new MockResponse()
  jest.spyOn(fs, 'stat').mockRejectedValueOnce({ code: 'ENOENT' })
  await handler(req as any, res as any)
  expect(res.writeHead).toBeCalledWith(404)
  expect(res.end).toBeCalledTimes(1)
})

it('unknown method => 501', async () => {
  const req = new MockRequest()
  const res = new MockResponse()
  await handler(req as any, res as any)
  expect(res.writeHead).toBeCalledWith(501)
  expect(res.end).toBeCalledTimes(1)
})
