import './connector.js'
import { Synchronizer } from "./Synchronizer.js"

const store = new Map<string, Synchronizer>()
const source = new EventSource('https://localhost/views')

source.addEventListener('message', async (ev: MessageEvent<string>) => {
  const sync = await getSynchronizer(ev.data)
  await sync.pull()
})
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') return
  const sync = await getSynchronizerByTabId(tabId)
  await sync.update(tab)
})
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  if (removeInfo.isWindowClosing) return
  const sync = await getSynchronizerByTabId(tabId)
  await sync.remove(removeInfo)
})
addEventListener('load', async () => {
  const url = new URL(source.url + '/')
  const [tabs, kv, res] = await Promise.all([
    chrome.tabs.query({}),
    chrome.storage.local.get(null),
    fetch(url, { headers: { accept: 'application/json' } })
  ])
  dispatchEvent(new CustomEvent('StoreLoad', { detail: kv }))
  for (const [k, tabId] of Object.entries(kv)) {
    if (!tabId) continue
    if (!tabs.some((v) => v.id === tabId)) continue
    const newSync = new Synchronizer(k, tabId)
    store.set(new URL(k).pathname, newSync)
    newSync.addEventListener('removed', () => store.delete(newSync.url))
  }
  dispatchEvent(new CustomEvent('StoreLoaded', { detail: [...store] }))
  const items = await res.json()
  dispatchEvent(new CustomEvent('BulkPull', { detail: items }))
  const pulled = new Set()
  for (const { id, ...data } of items) {
    const sync = store.get(url.pathname + id)
    if (sync) {
      sync.pull(data)
      pulled.add(sync)
    } else {
      const sync = new Synchronizer(url.href + id)
      store.set(url.pathname + id, sync)
      sync.addEventListener('removed', () => store.delete(sync.url))
      await sync.pull(data)
      pulled.add(sync)
    }
  }
  dispatchEvent(new CustomEvent('BulkPulled', { detail: [...pulled] }))
  const x = new Set([...store.values()].map((v) => v.tabId))
  dispatchEvent(new CustomEvent('BulkPush', { detail: tabs }))
  const pushed = []
  for (const tab of tabs) {
    if (!tab.id) continue
    if (pulled.has(tab.id)) continue
    const sync = new Synchronizer(url.href + tab.id, tab.id)
    store.set(url.pathname + tab.id, sync)
    await sync.push(tab)
    pushed.push(sync)
  }
  dispatchEvent(new CustomEvent('BulkPushed', { detail: pushed }))
  dispatchEvent(new Event('loaded'))
})

const loaded = new Promise((r) => addEventListener('loaded', r, { once: true }))
async function nextTick(): Promise<void> {
  await loaded
}


async function getSynchronizer(path: string): Promise<Synchronizer> {
  await nextTick()
  const sync = store.get(path)
  if (sync) return sync
  const url = new URL(path, source.url)
  const newSync = new Synchronizer(url.href)
  store.set(path, newSync)
  newSync.addEventListener('removed', () => store.delete(newSync.url))
  return newSync
}

async function getSynchronizerByTabId(tabId: number): Promise<Synchronizer> {
  await nextTick()
  const sync = [...store.values()].find(v => v.tabId === tabId)
  if (sync) return sync
  const url = new URL(source.url + '/' + tabId)
  const newSync = new Synchronizer(url.href, tabId)
  store.set(url.pathname, newSync)
  newSync.addEventListener('removed', () => store.delete(newSync.url))
  return newSync
}

dispatchEvent(new Event('load'))

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message === 'getStore') sendResponse([...store].map(([k, v]) => ({
    key: k,
    url: v.url,
    tabId: v.tabId,
    view: v.view
  })))
})
