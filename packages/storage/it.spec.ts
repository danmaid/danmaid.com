import { it, describe, afterAll } from "https://deno.land/std@0.222.1/testing/bdd.ts";
import { expect } from "https://deno.land/std@0.222.1/expect/expect.ts";

async function hash(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  const hex = Array.from(new Uint8Array(hash)).map(v => v.toString(16).padStart(2, '0')).join('')
  return hex
}

describe('xx', () => {
  const A = '<html></html>'
  const B = 'XYZ'

  let events: EventSource
  it("GET / { accept: 'event-stream' } => 200 { type: 'event-stream' }", async () => {
    const res = await fetch('/', { headers: { accept: 'text/event-stream' } })
    await res.body?.cancel()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/event-stream')
    events = new EventSource('/')
  })

  it("PUT /xxx/yyy/zzz { type: 'html' } A => 200 { location: '/xxx/yyy/zzz/hash(A)' }, event: saved /xxx/yyy/zzz/hash(A)", async () => {
    const event = new Promise(r => events.addEventListener('saved', ev => r(ev.data)))
    const res = await fetch('/xxx/yyy/zzz', { method: 'PUT', headers: { 'content-type': 'text/html' }, body: A })
    await res.body?.cancel()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-location')).toBe(`/xxx/yyy/zzz/${await hash(A)}`)
    await expect(event).resolves.toBe(`/xxx/yyy/zzz/${await hash(A)}`)
  })
  it("PUT /xxx/yyy/zzz { type: 'plain' } B => 200 { location: '/xxx/yyy/zzz/hash(B)' }, event: saved /xxx/yyy/zzz/hash(B)", async () => {
    const event = new Promise(r => events.addEventListener('saved', ev => r(ev.data)))
    const res = await fetch('/xxx/yyy/zzz', { method: 'PUT', headers: { 'content-type': 'text/plain' }, body: B })
    await res.body?.cancel()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-location')).toBe(`/xxx/yyy/zzz/${await hash(B)}`)
    await expect(event).resolves.toBe(`/xxx/yyy/zzz/${await hash(B)}`)
  })

  it("GET /xxx/yyy/zzz { accept: 'html' } => 200 { type: 'html', location: '/xxx/yyy/zzz/hash(A)' } A", async () => {
    const res = await fetch('/xxx/yyy/zzz', { headers: { accept: 'text/html' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/html')
    expect(res.headers.get('content-location')).toBe(`/xxx/yyy/zzz/${await hash(A)}`)
    await expect(res.text()).resolves.toBe(A)
  })
  it("GET /xxx/yyy/zzz { accept: 'plain' } => { type: 'plain', location: '/xxx/yyy/zzz/hash(B)' } B", async () => {
    const res = await fetch('/xxx/yyy/zzz', { headers: { accept: 'text/plain' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/plain')
    expect(res.headers.get('content-location')).toBe(`/xxx/yyy/zzz/${await hash(B)}`)
    await expect(res.text()).resolves.toBe(B)
  })

  it("GET /xxx/yyy/zzz => { type: 'plain', location: '/xxx/yyy/zzz/hash(B)' } B", async () => {
    const res = await fetch('/xxx/yyy/zzz')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/plain')
    expect(res.headers.get('content-location')).toBe(`/xxx/yyy/zzz/${await hash(B)}`)
    await expect(res.text()).resolves.toBe(B)
  })
  it("GET /xxx/yyy/zzz/hash(A) => { type: 'html' } A", async () => {
    const res = await fetch(`/xxx/yyy/zzz/${await hash(A)}`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/html')
    await expect(res.text()).resolves.toBe(A)
  })
  it("GET /xxx/yyy/zzz/hash(B) => { type: 'plain' } B", async () => {
    const res = await fetch(`/xxx/yyy/zzz/${await hash(B)}`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/plain')
    await expect(res.text()).resolves.toBe(B)
  })

  it("GET /xxx/yyy/zzz/ => { type: 'plain' } 'hash(A)\nhash(B)\n'", async () => {
    const res = await fetch(`/xxx/yyy/zzz/`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/plain')
    const text = await res.text()
    expect(text).toContain(`${await hash(A)}\n`)
    expect(text).toContain(`${await hash(B)}\n`)
  })
  it("GET /xxx/yyy/zzz/ { accept: 'json' } => [[hash(A), headers(A)], [hash(B), headers(B)]]", async () => {
    const res = await fetch(`/xxx/yyy/zzz/`, { headers: { accept: 'application/json' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/json')
    const index = await res.json()
    expect(index).toContainEqual([await hash(A), expect.any(Object)])
    expect(index).toContainEqual([await hash(B), expect.any(Object)])
  })
  it("GET /xxx/yyy/ => { type: 'plain' } 'zzz\n'", async () => {
    const res = await fetch(`/xxx/yyy/`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/plain')
    await expect(res.text()).resolves.toBe('zzz\n')
  })
  it("GET /xxx/ => { type: 'plain' } 'yyy\n'", async () => {
    const res = await fetch(`/xxx/`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/plain')
    await expect(res.text()).resolves.toBe('yyy\n')
  })
  it("GET / => { type: 'plain' } 'xxx\n'", async () => {
    const res = await fetch(`/`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/plain')
    await expect(res.text()).resolves.toBe('xxx\n')
  })

  afterAll(() => {
    events?.close()
  })
})
