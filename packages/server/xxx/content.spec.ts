import { expect } from 'https://deno.land/std@0.210.0/expect/expect.ts';
import { GET, DELETE } from './content.ts'
import { load, remove } from './file.mock.ts'

Deno.test('GET', async () => {
  load.calls.splice(0)
  await GET(new Request('https://danmaid.com'))
  expect(load.calls).toContainEqual(['/.application.json'])
  expect(load.calls).toContainEqual(['/'])
})

Deno.test("GET accept: '*/*'", async () => {
  load.calls.splice(0)
  const headers = { accept: '*/*' }
  await GET(new Request('https://danmaid.com', { headers }))
  expect(load.calls).toContainEqual(['/.application.json'])
  expect(load.calls).toContainEqual(['/'])
})

Deno.test("GET accept: 'text/html'", async () => {
  load.calls.splice(0)
  const headers = { accept: 'text/html' }
  const res = await GET(new Request('https://danmaid.com', { headers }))
  await res.body?.cancel()
  expect(load.calls).toContainEqual(['/.text.html.application.json'])
  expect(load.calls).toContainEqual(['/.text.html'])
})

Deno.test("GET accept: '*/*;q=0.8, text/html, text/plain'", async () => {
  load.calls.splice(0)
  load.setImpl(async () => { throw 'not found.' })
  const headers = { accept: '*/*;q=0.8, text/html, text/plain' }
  const res = await GET(new Request('https://danmaid.com', { headers }))
  await res.body?.cancel()
  expect(load.calls).toContainEqual(['/.text.html'])
  expect(load.calls).toContainEqual(['/.text.plain'])
  expect(load.calls).toContainEqual(['/'])
  const flat = load.calls.flat()
  const html = flat.indexOf('/.text.html')
  const plain = flat.indexOf('/.text.plain')
  const none = flat.indexOf('/')
  expect(html).toBeLessThan(none)
  expect(plain).toBeLessThan(none)
  expect(html).toBeLessThanOrEqual(plain)
  load.reset()
})

Deno.test('DELETE', async () => {
  remove.calls.splice(0)
  await DELETE(new Request('https://danmaid.com/xxx', { method: 'DELETE' }))
  expect(remove.calls).toContainEqual(['/xxx'])
})