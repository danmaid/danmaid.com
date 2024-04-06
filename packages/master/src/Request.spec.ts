import { it, expect } from '@jest/globals'
import { Readable } from 'node:stream'
import { Request } from './Request'

it('xxx', async () => {
  const x = { url: 'https://localhost', method: 'PUT', headers: {} }
  const req = Object.assign(Readable.from(Buffer.from('XYZ')), x)
  const request = await Request.from(req)
  expect(request).toBeInstanceOf(globalThis.Request)
  expect(request.method).toBe('PUT')
  await expect(request.text()).resolves.toBe('XYZ')
})
