import { describe, it, expect } from '@jest/globals'
import { Readable, PassThrough } from 'node:stream'
import { HttpDecoder } from './HttpDecoder'

describe('by master.ts', () => {
  it("in.pipe(decoder), decoder.once('response'), decoder.pipe(out)", async () => {
    const stream = Readable.from(['HTTP/1.1 200 OK\r\n', '\r\n', 'xxx'])
    const http = stream.pipe(new HttpDecoder())
    const args = await new Promise<any[]>(r => http.once('response', (...args) => r(args)))
    expect(args[0]).toBe(200)
    expect(args[1]).toBeInstanceOf(Headers)
    const headers = args[1] as Headers
    headers.forEach((v, k) => expect(k).toBe(1))
    const piped = http.pipe(new PassThrough())
    const chunks: Buffer[] = []
    piped.on('data', (chunk: Buffer) => chunks.push(chunk))
    await new Promise(r => piped.once('end', r))
    expect(Buffer.concat(chunks).toString()).toBe('xxx')
    expect.assertions(3)
  })
})

it('invalid status line', async () => {
  const stream = Readable.from(['GET / HTTP1.1\r\n', '\r\n'])
  const http = stream.pipe(new HttpDecoder())
  await expect(new Promise(r => http.on('error', r))).resolves.toThrow(TypeError)
})

it('no header, no body', async () => {
  const stream = Readable.from(['HTTP/1.1 200\r\n', '\r\n'])
  const http = new HttpDecoder()
  const res = new Promise<[number, Headers]>(r => http.once('response', (...args) => r(args)))
  const out = new PassThrough()
  const chunks: Buffer[] = []
  out.on('data', (chunk) => chunks.push(chunk))
  const end = new Promise<Buffer>(r => out.once('end', () => r(Buffer.concat(chunks))))

  stream.pipe(http).pipe(out)

  const [status, headers] = await res
  expect(status).toBe(200)
  expect(headers).toBeInstanceOf(Headers)
  headers.forEach((v, k) => expect(k).toBe(1))

  await expect(end).resolves.toHaveLength(0)
  expect.assertions(3)
})

it('no header, with body', async () => {
  const stream = Readable.from(['HTTP/1.1 200\r\n', '\r\n', new Uint8Array([0, 1, 2])])
  const http = new HttpDecoder()
  const res = new Promise<[number, Headers]>(r => http.once('response', (...args) => r(args)))
  const out = new PassThrough()
  const chunks: Buffer[] = []
  out.on('data', (chunk) => chunks.push(chunk))
  const end = new Promise<Buffer>(r => out.once('end', () => r(Buffer.concat(chunks))))

  stream.pipe(http).pipe(out)

  const [status, headers] = await res
  expect(status).toBe(200)
  expect(headers).toBeInstanceOf(Headers)
  headers.forEach((v, k) => expect(k).toBe(1))

  await expect(end).resolves.toStrictEqual(Buffer.from([0, 1, 2]))
  expect.assertions(3)
})

it('with header, no body', async () => {
  const stream = Readable.from(['HTTP/1.1 200\r\n', 'content-type: text/html\r\n', '\r\n'])
  const http = new HttpDecoder()
  const res = new Promise<[number, Headers]>(r => http.once('response', (...args) => r(args)))
  const out = new PassThrough()
  const chunks: Buffer[] = []
  out.on('data', (chunk) => chunks.push(chunk))
  const end = new Promise<Buffer>(r => out.once('end', () => r(Buffer.concat(chunks))))

  stream.pipe(http).pipe(out)

  const [status, headers] = await res
  expect(status).toBe(200)
  expect(headers).toBeInstanceOf(Headers)
  expect(headers.get('content-type')).toBe('text/html')

  await expect(end).resolves.toHaveLength(0)
})

it('with header, with body', async () => {
  const stream = Readable.from(['HTTP/1.1 200\r\n', 'content-type: text/html\r\n', '\r\n', 'xyz'])
  const http = new HttpDecoder()
  const res = new Promise<[number, Headers]>(r => http.once('response', (...args) => r(args)))
  const out = new PassThrough()
  const chunks: Buffer[] = []
  out.on('data', (chunk) => chunks.push(chunk))
  const end = new Promise<Buffer>(r => out.once('end', () => r(Buffer.concat(chunks))))

  stream.pipe(http).pipe(out)

  const [status, headers] = await res
  expect(status).toBe(200)
  expect(headers).toBeInstanceOf(Headers)
  expect(headers.get('content-type')).toBe('text/html')

  await expect(end).resolves.toStrictEqual(Buffer.from('xyz'))
})
