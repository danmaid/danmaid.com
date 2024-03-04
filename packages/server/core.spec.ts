import { expect } from 'https://deno.land/std@0.210.0/expect/mod.ts';
import { core } from './core.ts'

Deno.test('xx', async () => {
  const a = core
  const b = core.getElementByPath('/')
  const c = core.getElementByPath('/xxx')
  const d = core.getElementByPath('/xxx/')
  const e = core.getElementByPath('/xxx/yyy')

  const calls: unknown[] = []
  a.addEventListener('xxx', () => calls.push(a))
  b.addEventListener('xxx', () => calls.push(b))
  c.addEventListener('xxx', () => calls.push(c))
  d.addEventListener('xxx', () => calls.push(d))
  e.addEventListener('xxx', () => calls.push(e))

  const ev = new Event('xxx')
  a.dispatchEvent(ev)
  b.dispatchEvent(ev)
  c.dispatchEvent(ev)
  d.dispatchEvent(ev)
  e.dispatchEvent(ev)

  await new Promise(r => setTimeout(r, 100))
  expect(calls[0]).toBe(a)
  expect(calls[1]).toBe(b)

  expect(calls[2]).toBe(a)
  expect(calls[3]).toBe(b)

  expect(calls[4]).toBe(c)
  expect(calls[5]).toBe(a)
  expect(calls[6]).toBe(b)

  expect(calls[7]).toBe(d)
  expect(calls[8]).toBe(c)
  expect(calls[9]).toBe(a)
  expect(calls[10]).toBe(b)

  expect(calls[11]).toBe(e)
  expect(calls[12]).toBe(d)
  expect(calls[13]).toBe(c)
  expect(calls[14]).toBe(a)
  expect(calls[15]).toBe(b)

  expect(calls.length).toBe(16)
})
