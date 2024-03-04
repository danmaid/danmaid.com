import './connector.js'

class LoadedEvent<T> extends Event {
  items: T[]
  constructor(type: string, { items, ...eventInitDict }: EventInit & { items: T[] }) {
    super(type, eventInitDict)
    this.items = items
  }
}
interface TabsEventMap {
  loaded: LoadedEvent<number>
}
interface RemoteEventMap {
  loaded: LoadedEvent<string>
}

class SyncedEvent extends Event {
  pushed: number[]
  pulled: string[]
  removed: (string | number)[]
  constructor(type: string, { pushed, pulled, removed, ...eventInitDict }: EventInit & {
    pushed: number[], pulled: string[], removed: (string | number)[]
  }) {
    super(type, eventInitDict)
    this.pushed = pushed
    this.pulled = pulled
    this.removed = removed
  }
}

class TabEvent extends Event {
  readonly id
  readonly info
  readonly tab

  constructor(type: string, { id, info, tab, ...eventInitDict }: EventInit & {
    id?: number
    info?: chrome.tabs.TabChangeInfo | chrome.tabs.TabRemoveInfo
    tab?: chrome.tabs.Tab
  }) {
    super(type, eventInitDict)
    this.id = id
    this.info = info
    this.tab = tab
  }
}

const endpoint = 'https://localhost/views'

interface Tab extends chrome.tabs.Tab {
  id: number
}
const Tab = {
  isTab: (v: chrome.tabs.Tab): v is Tab => !!v.id
}

class RemoteEvent extends Event {
  readonly path
  readonly tab
  readonly id
  constructor(type: string, { path, tab, ...init }: EventInit & { path: string, tab?: Tab }) {
    super(type, init)
    this.path = path
    this.tab = tab
    this.id = tab?.id
  }
}

interface RemoteEventMap {
  updated: RemoteEvent & { tab: Tab, id: number }
  removed: Omit<RemoteEvent, 'tab'>
  update: RemoteEvent & { tab: Tab, id: number }
}
interface Remote {
  addEventListener<K extends keyof RemoteEventMap>(type: K, listener: (ev: RemoteEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener<K extends keyof EventSourceEventMap>(type: K, listener: (this: EventSource, ev: EventSourceEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: (this: EventSource, event: MessageEvent) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}
class Remote extends EventSource {
  type = 'Remote'
  async getAll(): Promise<{ path: string, tab: Tab }[]> {
    const url = new URL(this.url)
    url.pathname += '/'
    const res = await fetch(url, { headers: { accept: 'application/json' } })
    const items = await res.json()
    return items.map((tab: Tab) => ({ path: url.pathname + tab.id, tab }))
  }

  async create(tab: Tab) {
    const path = new URL(this.url).pathname + '/' + tab.id
    return this.update(path, tab)
  }
  async get(path: string) {
    const url = new URL(path, this.url)
    const res = await fetch(url, { headers: { accept: 'application/json' } })
    return await res.json()
  }
  async update(path: string, tab: Tab) {
    const url = new URL(path, this.url)
    this.dispatchEvent(new RemoteEvent('update', { path: url.pathname, tab }))
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(tab)
    })
    await res.body?.cancel()
  }
  async remove(path: string) {
    const url = new URL(path, this.url)
    this.dispatchEvent(new RemoteEvent('remove', { path: url.pathname }))
    const res = await fetch(url, { method: 'DELETE' })
    await res.body?.cancel()
  }

  constructor(...args: ConstructorParameters<typeof EventSource>) {
    super(...args)
    this.addEventListener('message', async ({ data: path }: MessageEvent<string>) => {
      try {
        const tab = await this.get(path)
        this.dispatchEvent(new RemoteEvent('updated', { path, tab }))
      } catch {
        this.dispatchEvent(new RemoteEvent('removed', { path }))
      }
    })
  }
}
const remote = new Remote(endpoint)

const map = new class extends EventTarget {
  type = 'Map'
  map = new Map<string | number, string | number>()
  async load() {
    this.dispatchEvent(new Event('load'))
    const kv = await chrome.storage.local.get(null)
    for (const [k, v] of Object.entries(kv)) {
      const key = parseInt(k)
      const value = parseInt(v)
      this.map.set(!!key ? key : k, !!value ? value : v)
    }
    this.dispatchEvent(new LoadedEvent('loaded', { items: [...this.map] }))
  }
  get(key: string): number | undefined
  get(key: number): string | undefined
  get(key: string | number) {
    return this.map.get(key)
  }
  keys() {
    return this.map.keys()
  }
  delete(key: string | number): boolean {
    const result = this.map.delete(key)
    chrome.storage.local.remove(String(key))
    return result
  }
  has(key: string | number) {
    return this.map.has(key)
  }
  set(key: string, value: number): this
  set(key: number, value: string): this
  set(key: string | number, value: string | number): this {
    this.map.set(key, value)
    this.map.set(value, key)
    this.dispatchEvent(new CustomEvent('set', { detail: [...this.map] }))
    chrome.storage.local.set({ [String(key)]: value, [String(value)]: key })
    return this
  }
}()

interface TabsEventMap {
  updated: TabEvent & { id: number, tab: Tab }
  removed: TabEvent & { id: number }
  created: TabEvent & { id: number, tab: Tab }
}
interface Tabs {
  addEventListener<K extends keyof TabsEventMap>(type: K, listener: (ev: TabsEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void
}
class Tabs extends EventTarget {
  type = 'Tabs'
  constructor() {
    super()
    chrome.tabs.onUpdated.addListener((id, info, tab) => {
      this.dispatchEvent(new TabEvent('updated', { id, info, tab }))
    })
    chrome.tabs.onRemoved.addListener((id, info) => {
      this.dispatchEvent(new TabEvent('removed', { id, info }))
    })
  }

  async update(id: number, tab: Tab) {
    this.dispatchEvent(new Event('update'))
    const old = await chrome.tabs.get(id)
    const change = this.diff(old, tab)
    if (!change) return
    const result = await chrome.tabs.update(id, change)
    this.dispatchEvent(new TabEvent('updated', { id, info: change, tab: result }))
    return result
  }
  async create(tab: Tab) {
    this.dispatchEvent(new Event('create'))
    const result = await chrome.tabs.create({ url: tab.url })
    this.dispatchEvent(new TabEvent('created', { id: result.id, tab: result }))
    return result
  }
  async getAll(): Promise<Tab[]> {
    const tabs = await chrome.tabs.query({})
    return tabs.filter(Tab.isTab)
  }
  async remove(id: number) {
    this.dispatchEvent(new Event('remove'))
    await chrome.tabs.remove(id)
    this.dispatchEvent(new TabEvent('removed', { id }))
  }

  diff(tab: chrome.tabs.Tab, old: chrome.tabs.Tab) {
    const change: chrome.tabs.UpdateProperties = {}
    if (old.active !== tab.active) change.active = tab.active
    if (old.autoDiscardable !== tab.autoDiscardable) change.autoDiscardable = tab.autoDiscardable
    if (old.highlighted !== tab.highlighted) change.highlighted = tab.highlighted
    if (old.mutedInfo?.muted !== tab.mutedInfo?.muted) change.muted = tab.mutedInfo?.muted
    if (old.openerTabId !== tab.openerTabId) change.openerTabId = tab.openerTabId
    if (old.pinned !== tab.pinned) change.pinned = tab.pinned
    if (tab.url && old.url !== tab.url) change.url = tab.url
    if (Object.keys(change).length < 1) return console.log('no change.')
    return change
  }
}
const tabs = new Tabs()

remote.addEventListener('update', ({ path, id }) => map.set(path, id))
remote.addEventListener('updated', async ({ path, tab }) => {
  const id = map.get(path)
  if (id) tabs.update(id, tab)
  else {
    const { id } = await tabs.create(tab)
    if (!id) throw Error('created tab is not have id.')
    map.set(id, path).set(path, id)
  }
})
remote.addEventListener('removed', ({ path }) => {
  const id = map.get(path)
  if (id) tabs.remove(id)
})

tabs.addEventListener('updated', ({ id, tab }) => {
  const path = map.get(id)
  path ? remote.update(path, tab) : remote.create(tab)
})
tabs.addEventListener('removed', ({ id }) => {
  const path = map.get(id)
  if (!path) return
  map.delete(id)
  map.delete(path)
  remote.remove(path)
})
// tabs.addEventListener('created', ({id, tab}) => map.set())

addEventListener('wakeup', async () => {
  dispatchEvent(new Event('sync'))
  await map.load()
  const pulled = await pull()
  const pushed = await push()
  const synced = new Set([...pulled, ...pushed])
  // const removed = [...map.keys()].filter(k => !synced.has(k) && map.delete(k))
  const removed: string[] = []
  dispatchEvent(new SyncedEvent('synced', { pulled, pushed, removed }))
})

async function pull() {
  dispatchEvent(new Event('pull'))
  const items: string[] = []
  for (const { path, tab } of await remote.getAll()) {
    const tabId = map.get(path)
    tabId ? tabs.update(tabId, tab) : tabs.create(tab)
    items.push(path)
  }
  dispatchEvent(new LoadedEvent('pulled', { items }))
  return items
}

async function push() {
  dispatchEvent(new Event('push'))
  const items: number[] = []
  for (const tab of await tabs.getAll()) {
    if (map.has(tab.id)) continue
    remote.create(tab)
    items.push(tab.id)
  }
  dispatchEvent(new LoadedEvent('pushed', { items }))
  return items
}

dispatchEvent(new Event('wakeup'))
