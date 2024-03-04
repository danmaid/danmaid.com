import { expect } from 'https://deno.land/std@0.210.0/expect/expect.ts';
import './main.ts'

Deno.test('PUT -> StoreEvent', async () => {
    const res = await fetch('/xxx', { method: 'PUT', body: 'xxx' })
    expect(res.status).toBe(500)
    await res.body?.cancel()
})
