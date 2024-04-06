import { it, expect } from '@jest/globals'
import { Readable } from 'node:stream'
import { Response } from './Response'

it('Response', async () => {
  const res = await Response.from(Readable.from([
    'HTTP/1.1 202\r\n',
    'xxx: XXX\r\n',
    '\r\n',
    Buffer.from('XYZ')
  ]))
  expect(res).toBeInstanceOf(globalThis.Response)
  expect(res.status).toBe(202)
  expect(res.headers.get('xxx')).toBe('XXX')
  await expect(res.text()).resolves.toBe('XYZ')
})
