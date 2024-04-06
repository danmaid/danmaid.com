import { it, expect, jest } from '@jest/globals'
import { Readable } from 'node:stream'
import { Http2ServerRequest, Http2ServerResponse } from 'node:http2'
import { Session } from './Session'
import { HttpDecoder } from './HttpDecoder'

it('stream() => application/http request stream', async () => {
  const req = new Request('https://localhost', {
    method: 'PUT',
    headers: { 'content-type': 'text/plain' },
    body: 'XYZ'
  }) as unknown as Http2ServerRequest
  const res = { write: jest.fn(), writeHead: jest.fn(), once: jest.fn() } as unknown as Http2ServerResponse
  const session = new Session(req, res)

  const stream = session.stream()
  expect(stream).toBeInstanceOf(Readable)
  const http = stream.pipe(new HttpDecoder())
  const head = new Promise<any>(resolve => {
    http.once('request', (method, target, headers) => {
      resolve({ method, target, headers })
    })
  })
  const body = new Promise(resolve => {
    const chunks: Buffer[] = []
    http.on('data', (chunk: Buffer) => chunks.push(chunk))
    http.once('end', () => resolve(Buffer.concat(chunks)))
  })
  const { method, target, headers } = await head
  expect(method).toBe('PUT')
  expect(target).toBe('/')
  expect(headers).toStrictEqual(new Headers({ 'content-type': 'text/plain' }))
  await expect(body).resolves.toStrictEqual(Buffer.from('XYZ'))
})

it('stream()', async () => {
  const req = new Request('https://localhost', {
    method: 'PUT',
    headers: { 'content-type': 'text/plain' },
    body: 'XYZ'
  }) as unknown as Http2ServerRequest
  const res = { write: jest.fn(), writeHead: jest.fn(), once: jest.fn() } as unknown as Http2ServerResponse
  const session = new Session(req, res)
  session.stream()
})
