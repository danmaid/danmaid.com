import { expect } from "https://deno.land/std@0.210.0/expect/expect.ts";
import { describe, it } from "https://deno.land/std@0.212.0/testing/bdd.ts";
import { EventSource } from './EventSource.ts'

// const endpoint = 'https://danmaid.com/views'
const endpoint = 'https://localhost/views'
const allowOrigin = 'chrome-extension://hmnkpdkofkhlnfdefjamlhhmgcfeoppc'

// https://developer.chrome.com/docs/extensions/reference/api/tabs#type-Tab
class Tab {
  active = false
  audible?: boolean
  autoDiscardable?: boolean
  discarded?: boolean
  favIconUrl?: string
  groupId?: number
  height?: number
  highlighted = false
  id?: number
  incognito = false
  index = 1
  lastAccessed?: number
  mutedInfo?: {
    extensionId?: string
    muted: boolean
    reason?: 'user' | 'capture' | 'extension'
  }
  openerTabId?: number
  pendingUrl?: string
  pinned = false
  sessionId?: string
  status?: 'unloaded' | 'loading' | 'complete'
  title?: string
  url?: string
  width?: string
  windowId = 1

  constructor(init?: Partial<Tab>) {
    if (init) Object.assign(this, init)
  }
}

describe('use extension.', () => {
  it('PUT', async () => {
    const tab = new Tab({ id: 123 })
    const res = await fetch(`${endpoint}/${tab.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(tab)
    })
    expect(res.status).toBe(200)
    await res.body?.cancel()
  })

  it('DELETE', async () => {
    const tab = new Tab({ id: 123 })
    const res = await fetch(`${endpoint}/${tab.id}`, { method: 'DELETE' })
    expect(res.status).toBe(200)
    await res.body?.cancel()
  })

  it('EventSource', async () => {
    const views = new EventSource(`${endpoint}`)
    await new Promise((r) => views.addEventListener('open', r))
    expect(views.readyState).toBe(views.OPEN)
    views.close()
  })

  it('CORS GET', async () => {
    const res = await fetch(endpoint, { headers: { accept: 'text/event-stream' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(allowOrigin)
    await res.body?.cancel()
  })

  it('CORS PUT', async () => {
    const res = await fetch(endpoint, { method: 'PUT', body: JSON.stringify({}) })
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(allowOrigin)
    await res.body?.cancel()
  })

  it('CORS DELETE', async () => {
    const res = await fetch(endpoint, { method: 'DELETE' })
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(allowOrigin)
    await res.body?.cancel()
  })

  it('CORS preflight', async () => {
    const res = await fetch(endpoint, { method: 'OPTIONS' })
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(allowOrigin)
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('PUT, DELETE')
    expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
    await res.body?.cancel()
  })
})

describe('use html.', () => {
  it('navigate', async () => {
    const res = await fetch(endpoint, { headers: { accept: 'text/html' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/html')
    const text = await res.text()
    const html = await Deno.readTextFile('./index.html')
    expect(text).toBe(html)
  })

  it('view change', async () => {
    const views = new EventSource(`${endpoint}`)
    await new Promise((r) => views.addEventListener('open', r))
    expect(views.readyState).toBe(views.OPEN)
    const change = new Promise((r) => views.addEventListener('change', (ev) => r(ev.data)))
    const tab = new Tab({ id: 234 })
    const res = await fetch(`${endpoint}/${tab.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(tab)
    })
    expect(res.ok).toBe(true)
    await res.body?.cancel()
    expect(await change).toBe(JSON.stringify(tab))
    views.close()
  })

  it('view remove', async () => {
    const views = new EventSource(`${endpoint}`)
    await new Promise((r) => views.addEventListener('open', r))
    expect(views.readyState).toBe(views.OPEN)
    const remove = new Promise((r) => views.addEventListener('remove', (ev) => r(ev.data)))
    const res = await fetch(`${endpoint}/234`, { method: 'DELETE' })
    expect(res.ok).toBe(true)
    await res.body?.cancel()
    expect(await remove).toBe('234')
    views.close()
  })

  it('GET', async () => {
    const res = await fetch(endpoint, { headers: { accept: 'application/json' } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toBeInstanceOf(Array)
  })

  it('PUT -> GET', async () => {
    const tab = new Tab({ id: 234 })
    const put = await fetch(`${endpoint}/${tab.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(tab)
    })
    await put.body?.cancel()
    const res = await fetch(endpoint, { headers: { accept: 'application/json' } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toContainEqual(JSON.parse(JSON.stringify(tab)))
  })

  it('PATCH', async () => {
    const body = JSON.stringify({ highlighted: true })
    const res = await fetch(`${endpoint}/234`, { method: 'PATCH', body })
    expect(res.status).toBe(200)
    await res.body?.cancel()
  })

  it('PATCH -> change', async () => {
    const tab = new Tab({ id: 234 })
    const put = await fetch(`${endpoint}/${tab.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(tab)
    })
    await put.body?.cancel()

    const views = new EventSource(`${endpoint}`)
    await new Promise((r) => views.addEventListener('open', r))
    expect(views.readyState).toBe(views.OPEN)
    const changed = new Promise((resolve, reject) => views.addEventListener('change', (ev) => {
      'data' in ev && typeof ev.data === 'string' ? resolve(JSON.parse(ev.data)) : reject(ev)
    }))
    const body = JSON.stringify({ highlighted: true })
    const res = await fetch(`${endpoint}/234`, { method: 'PATCH', body })
    expect(res.ok).toBe(true)
    await res.body?.cancel()

    expect(await changed).toHaveProperty('highlighted', true)
    views.close()
  })
})