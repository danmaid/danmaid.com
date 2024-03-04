// const endpoint = 'https://danmaid.com/views'
const endpoint = 'https://localhost/views'

// https://developer.chrome.com/docs/extensions/reference/api/tabs#type-Tab
class Tab {
  active = false
  highlighted = false
  incognito = false
  index = 1
  pinned = false
  windowId = 1

  constructor(init) {
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
    const res = await fetch(`${endpoint}/${tab.id}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
    await res.body?.cancel()
  })

  it('EventSource', async () => {
    const views = new EventSource(`${endpoint}`)
    await new Promise((r) => views.addEventListener('open', r))
    expect(views.readyState).toBe(views.OPEN)
    views.close()
  })
})

describe('use html.', () => {
  it('navigate', async () => {
    const res = await fetch(endpoint, { headers: { accept: 'text/html' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/html; charset=UTF-8')
    await res.text()
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
    expect(await change).toBe(new URL(`${endpoint}/${tab.id}`).pathname)
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
    expect(await remove).toBe(new URL(`${endpoint}/234`).pathname)
    views.close()
  })

  it('list', async () => {
    const res = await fetch(endpoint + '/', { headers: { accept: 'application/json' } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toBeInstanceOf(Array)
  })

  it('PUT -> list', async () => {
    const tab = new Tab({ id: 234 })
    const put = await fetch(`${endpoint}/${tab.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(tab)
    })
    await put.body?.cancel()
    const res = await fetch(endpoint + '/', { headers: { accept: 'application/json' } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.some((v) => v.id === `${tab.id}`)).toBe(true)
  })

  it('PATCH', async () => {
    const res = await fetch(`${endpoint}/234`, {
      method: 'PATCH',
      body: JSON.stringify({ highlighted: true }),
      headers: { 'content-type': 'application/json' }
    })
    expect(res.status).toBe(200)
    await res.body?.cancel()
    {
      const res = await fetch(`${endpoint}/234`)
      expect(res.ok).toBe(true)
      const data = await res.json()
      expect(data.highlighted).toBe(true)
    }
  })

  it('PATCH -> change', async () => {
    const tab = new Tab({ id: 234 })
    const put = await fetch(`${endpoint}/${tab.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(tab)
    })
    await put.body?.cancel()
    const res = await fetch(`${endpoint}/234`, { headers: { accept: 'application/json' } })
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.highlighted).toBe(false)
    const views = new EventSource(`${endpoint}`)
    await new Promise((r) => views.addEventListener('open', r))
    expect(views.readyState).toBe(views.OPEN)
    const change = new Promise((r) => views.addEventListener('change', (ev) => r(ev.data)))
    {
      const res = await fetch(`${endpoint}/234`, {
        method: 'PATCH',
        body: JSON.stringify({ highlighted: true }),
        headers: { 'content-type': 'application/json' }
      })
      expect(res.ok).toBe(true)
      await res.body?.cancel()
    }
    {
      expect(await change).toBe(new URL(`${endpoint}/234`).pathname)
      views.close()
      const res = await fetch(`${endpoint}/234`, { headers: { accept: 'application/json' } })
      expect(res.ok).toBe(true)
      const patched = await res.json()
      expect(patched.highlighted).toBe(true)
    }
  })
})
