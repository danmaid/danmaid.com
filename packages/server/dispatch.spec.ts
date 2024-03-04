import { expect } from 'https://deno.land/std@0.210.0/expect/expect.ts';
import { dispatch, StoreEvent } from './dispatch.ts'

Deno.test('PUT -> StoreEvent', async () => {
  const x = new Promise(r => addEventListener('store', r, { once: true }))
  await dispatch(new Request('xxx', { method: 'PUT', body: 'xxx' }))
  expect(await x).toBeInstanceOf(StoreEvent)
})

Deno.test('PUT -> StoreEvent -> waitUntil', async () => {
  let call = false
  addEventListener('store', (ev) => ev.waitUntil(new Promise((resolve) => {
    setTimeout(() => resolve(call = true), 100)
  })))
  await dispatch(new Request('xxx', { method: 'PUT', body: 'xxx' }))
  expect(call).toBe(true)
})