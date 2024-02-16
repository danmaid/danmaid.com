import { expect } from 'https://deno.land/std@0.210.0/expect/expect.ts';
import { connect, broadcast } from './sse.ts'

Deno.test('connect', async () => {
  const req = new Request('https://danmaid.com')
  const res = connect(req)
  expect(res).toBeInstanceOf(Response)
  expect(res.headers.get('content-type')).toBe('text/event-stream')
  expect(res.headers.get('cache-control')).toBe('no-store')
  expect(res.body).toBeInstanceOf(ReadableStream)
  if (!res.body) throw Error()
  const reader = res.body.getReader()
  const { value } = await reader.read()
  expect(new TextDecoder().decode(value)).toBe('retry: 5000\n\n')
})

Deno.test('broadcast', async () => {
  const req = new Request('https://danmaid.com')
  const c1 = connect(req)
  if (!c1.body) throw Error()
  const r1 = c1.body.getReader()
  await r1.read()

  const c2 = connect(req)
  if (!c2.body) throw Error()
  const r2 = c2.body.getReader()
  await r2.read()

  const id = broadcast('xxx')

  const x1 = await r1.read()
  const t1 = new TextDecoder().decode(x1.value)
  expect(t1).toBe(`data: xxx\nid: ${id}\n\n`)

  const x2 = await r2.read()
  const t2 = new TextDecoder().decode(x2.value)
  expect(t2).toBe(`data: xxx\nid: ${id}\n\n`)
})

Deno.test('client is dead', async () => {
  const req = new Request('https://danmaid.com')
  const c1 = connect(req)
  if (!c1.body) throw Error()
  const r1 = c1.body.getReader()
  await r1.read()

  const c2 = connect(req)
  await c2.body?.cancel()

  const id = broadcast('xxx')

  const x1 = await r1.read()
  const t1 = new TextDecoder().decode(x1.value)
  expect(t1).toBe(`data: xxx\nid: ${id}\n\n`)
})

Deno.test('with type', async () => {
  const req = new Request('https://danmaid.com')
  const res = connect(req)
  expect(res.body).toBeInstanceOf(ReadableStream)
  if (!res.body) throw Error()
  const reader = res.body.getReader()
  await reader.read()

  const id = broadcast('xxx', 'change')

  const { value } = await reader.read()
  const text = new TextDecoder().decode(value)
  expect(text).toBe(`event: change\ndata: xxx\nid: ${id}\n\n`)
})

Deno.test('reconnect', async () => {
  const last = broadcast('xyz')
  const headers = { 'Last-Event-ID': last }
  const req = new Request('https://danmaid.com', { headers })
  const res = connect(req)
  expect(res.body).toBeInstanceOf(ReadableStream)
  if (!res.body) throw Error()
  const reader = res.body.getReader()
  await reader.read()
  const { value } = await reader.read()
  const text = new TextDecoder().decode(value)
  expect(text).toBe(`data: xyz\nid: ${last}\n\n`)
})
