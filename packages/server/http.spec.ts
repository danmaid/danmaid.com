import { expect } from 'https://deno.land/std@0.210.0/expect/expect.ts';
import './http.ts'

Deno.test('xxx', () => { })

Deno.test('PUT -> StoreEvent', async () => {
    const x = new Promise(r => addEventListener('store', r, { once: true }))
    const res = await fetch('', { method: 'PUT', body: 'xxx' })
    expect(res.status).toBe(500)
    expect(await x).toHaveProperty('path')
    expect(await x).toHaveProperty('data')
    await res.body?.cancel()
})
