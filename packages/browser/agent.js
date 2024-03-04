// @todo web push
// const endpoint = 'https://danmaid.com/views'
const endpoint = 'https://localhost/views'
const remote = new EventSource(endpoint)

remote.addEventListener('message', async ({ data: path }) => {
  if (!path.startsWith(new URL(endpoint).pathname)) return console.log('ignore.', path)
  const res = await fetch(new URL(path, endpoint), { headers: { accept: 'application/json' } })
  if (res.status === 404) {
    const id = path.slice(path.lastIndexOf('/') + 1)
    console.log('to remove', id)
    return chrome.tabs.remove(parseInt(id))
  }
  if (!res.ok) throw Error('not ok.', { cause: res })
  const id = res.url.slice(res.url.lastIndexOf('/') + 1)
  const tab = await res.json()
  // if (tab.links) return console.log('links found.', tab.links)
  try {
    console.log('check exists.')
    const old = await chrome.tabs.get(parseInt(id))
    const change = {}
    if (old.active !== tab.active) change.active = tab.active
    if (old.autoDiscardable !== tab.autoDiscardable) change.autoDiscardable = tab.autoDiscardable
    if (old.highlighted !== tab.highlighted) change.highlighted = tab.highlighted
    if (old.mutedInfo?.muted !== tab.mutedInfo?.muted) change.muted = tab.mutedInfo.muted
    if (old.openerTabId !== tab.openerTabId) change.openerTabId = tab.openerTabId
    if (old.pinned !== tab.pinned) change.pinned = tab.pinned
    if (tab.url && old.url !== tab.url) change.url = tab.url
    if (Object.keys(change).length > 1) {
      loading.add((tabId, info, remove) => {
        if (tabId !== id) return false
        if (info.status !== 'complete') return true
        remove()
        console.log('removed.', loading)
        return true
      })
      return chrome.tabs.update(id, change)
    }
    console.log('found. but no change.')
  } catch (err) {
    console.log('try to create.', err)
    const { url } = tab
    const { id } = await chrome.tabs.create(url ? { url } : {})
    loading.add((tabId, info, remove) => {
      if (tabId !== id) return false
      if (info.status !== 'complete') return true
      remove()
      return true
    })
    const res = await fetch(`${endpoint}/${id}`, {
      method: 'PUT',
      headers: { 'location': path },
    })
    await res.body.cancel()
  }
})

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  console.log('onUpdated', tabId, info, tab)
  if (info.status === 'loading') loading.set(tabId)
  if (loading.check(tabId, info)) return console.log('now loading. ignore.', tabId)
  const res = await fetch(`${endpoint}/${tabId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(tab),
  })
  await res.body.cancel()
})
chrome.tabs.onRemoved.addListener(async (tabId, info) => {
  const res = await fetch(`${endpoint}/${tabId}`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(info),
  })
  await res.body.cancel()
})

const loading = new class extends Set {
  ids = new Set()
  set(id) {
    if (this.ids.has(id)) return
    this.add((tabId, info, remove) => {
      if (tabId !== id) return false
      if (info.status !== 'complete') return true
      remove()
      console.log('removed.', id, this.size)
      return false
    })
    console.log('set', id, this.size)
  }
  check(id, info) {
    console.log('check', this.size)
    for (const listener of this) {
      if (listener(id, info, () => this.delete(listener))) return true
    }
    return false
  }
}()

async function init() {
  // remote -> local
  const res = await fetch(endpoint + '/', { headers: { accept: 'application/json' } })
  const items = await res.json()
  const exists = new Set()
  for (const { id, ...tab } of items) {
    if (tab.links) return console.log('links found.', tab.links)
    try {
      console.log('check exists.')
      const old = await chrome.tabs.get(parseInt(id))
      exists.add(parseInt(id))
      const change = {}
      if (old.active !== tab.active) change.active = tab.active
      if (old.autoDiscardable !== tab.autoDiscardable) change.autoDiscardable = tab.autoDiscardable
      if (old.highlighted !== tab.highlighted) change.highlighted = tab.highlighted
      if (old.mutedInfo?.muted !== tab.mutedInfo?.muted) change.muted = tab.mutedInfo.muted
      if (old.openerTabId !== tab.openerTabId) change.openerTabId = tab.openerTabId
      if (old.pinned !== tab.pinned) change.pinned = tab.pinned
      if (tab.url && old.url !== tab.url) change.url = tab.url
      if (Object.keys(change).length > 1) {
        return chrome.tabs.update(id, change)
      }
      console.log('found. but no change.')
    } catch (err) {
      console.log('try to create.', err)
      const { url } = tab
      const created = await chrome.tabs.create(url ? { url } : {})
      loading.add((id, info, remove) => {
        if (id !== created.id) return false
        if (info.status !== 'complete') return true
        remove()
        console.log('removed.', loading)
        return true
      })
      const res = await fetch(`${endpoint}/${created.id}`, {
        method: 'PUT',
        headers: { 'location': `${endpoint}/${id}` },
      })
      await res.body.cancel()

    }
  }
  // // local -> remote
  // for (const { id, ...tab } of await chrome.tabs.query({})) {
  //   if (!id) return console.log('ignore. id not found.')
  //   if (exists.has(id)) return console.log('ignore. remote exists.')
  //   const res = await fetch(`${endpoint}/${id}`, {
  //     method: 'PUT',
  //     headers: { 'content-type': 'application/json' },
  //     body: JSON.stringify(tab),
  //   })
  //   await res.body.cancel()
  // }
}
init()
