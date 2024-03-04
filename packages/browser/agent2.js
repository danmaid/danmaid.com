import { Controller } from './lib/Controller.js'

// @todo web push
// const endpoint = 'https://danmaid.com/views'
const endpoint = 'https://localhost/views'
const remote = new EventSource(endpoint)

const controller = new class extends Controller {
  set(key, value) {
    super.set(key, value)
    chrome.storage.local.set({ [String(key)]: value, [String(value)]: key })
  }
  delete(key, fn) {
    super.delete(key, fn)
    chrome.storage.local.remove(String(key))
  }
  async load() {
    const kv = await chrome.storage.local.get(null)
    for (const [k, v] of Object.entries(kv)) {
      const key = parseInt(k)
      const value = parseInt(v)
      super.set(!!key ? key : k, !!value ? value : v)
    }
    console.log(this.map)
  }
}()

remote.addEventListener('message', ({ data: path }) => {
  if (!path.startsWith(new URL(endpoint).pathname)) return console.log('ignore.', path)
  console.log('message', path)
  controller.enqueue(path, async (path, id) => {
    console.log('remote', path, id)
    const res = await fetch(new URL(path, endpoint), { headers: { accept: 'application/json' } })
    if (res.status === 404) {
      console.log('remove', id)
      return controller.delete(path, (id) => chrome.tabs.remove(id))
    }
    const tab = await res.json()
    if (id) {
      console.log('update', id, tab)
      const old = await chrome.tabs.get(id)
      const change = {}
      if (old.active !== tab.active) change.active = tab.active
      if (old.autoDiscardable !== tab.autoDiscardable) change.autoDiscardable = tab.autoDiscardable
      if (old.highlighted !== tab.highlighted) change.highlighted = tab.highlighted
      if (old.mutedInfo?.muted !== tab.mutedInfo?.muted) change.muted = tab.mutedInfo.muted
      if (old.openerTabId !== tab.openerTabId) change.openerTabId = tab.openerTabId
      if (old.pinned !== tab.pinned) change.pinned = tab.pinned
      if (tab.url && old.url !== tab.url) change.url = tab.url
      if (Object.keys(change).length < 1) return console.log('no change.')
      return chrome.tabs.update(id, change)
    } else {
      console.log('create', tab)
      return await controller.create(path, async () => {
        const init = tab.url ? { url: tab.url } : {}
        const { id } = await chrome.tabs.create(init)
        return id
      })
    }
  })
  controller.lastOnlyRun(path)
})

chrome.tabs.onUpdated.addListener((id, info, tab) => {
  console.log('onUpdated', id, info, tab)
  if (!controller.has(id)) controller.set(id, new URL(endpoint).pathname + '/' + id)
  controller.enqueue(id, async (id, path) => {
    const res = await fetch(new URL(path, endpoint), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(tab),
    })
    await res.body.cancel()
  })
  controller.sequentialRun(id)
})
chrome.tabs.onRemoved.addListener((id, info) => {
  console.log('onRemoved', id, info)
  controller.delete(id, async (path) => {
    const res = await fetch(new URL(path, endpoint), { method: 'DELETE' })
    await res.body.cancel()
  })
})

init()
async function init() {
  await controller.load()
  // remote -> local
  const res = await fetch(endpoint + '/', { headers: { accept: 'application/json' } })
  const items = await res.json()
  const exists = new Set()
  for (const { id, ...tab } of items) {
    try {
      console.log('check exists.', id)
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
      if (Object.keys(change).length < 1) {
        console.log('no change.')
        continue
      }
      chrome.tabs.update(parseInt(id), change)
      continue
    } catch (err) {
      console.log('create', id, err)
      controller.create(new URL(endpoint).pathname + '/' + id, async () => {
        const init = tab.url ? { url: tab.url } : {}
        const { id } = await chrome.tabs.create(init)
        return id
      })
    }
  }
}
