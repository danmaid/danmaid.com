type View = chrome.tabs.Tab

export class Synchronizer extends EventTarget {
  view?: View

  constructor(readonly url: string, public tabId?: number) {
    super()
    if (!tabId) this.#next = this.setTabId()
    this.#next.then(() => this.save())
  }

  #next: Promise<any> = Promise.resolve()
  async nextTick(): Promise<void> {
    await this.#next
  }

  async setTabId() {
    const { id } = await chrome.tabs.create({})
    if (!id) throw Error('id is not found.')
    this.tabId = id
    this.dispatchEvent(new CustomEvent('TabCreated', { detail: id }))
  }

  async pull(view?: View): Promise<void> {
    await this.nextTick();
    this.dispatchEvent(new CustomEvent('pull', { detail: view }))
    if (!view) {
      const res = await fetch(this.url, { headers: { accept: 'application/json' } })
      if (res.status === 404) {
        if (this.tabId) await chrome.tabs.remove(this.tabId)
        return
      }
      const view = await res.json()
      return await this.pull(view)
    }
    if (view.url === this.view?.url) return console.log('no change.')
    this.view = view
    if (this.tabId) {
      const { url } = this.view
      chrome.tabs.update(this.tabId, { url })
    }
    this.dispatchEvent(new CustomEvent('pulled', { detail: this.view }))
  }
  async push(tab?: chrome.tabs.Tab): Promise<void> {
    await this.nextTick();
    if (tab?.status === 'loading') return
    this.dispatchEvent(new CustomEvent('push', { detail: tab }))
    if (tab) this.view = tab
    const res = await fetch(this.url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.view)
    })
    await res.body?.cancel()
    this.dispatchEvent(new CustomEvent('pushed', { detail: this.view }))
  }

  async update(tab: chrome.tabs.Tab) {
    await this.nextTick();
    if (tab.url === this.view?.url && tab.title === this.view?.title) return console.log('no change.')
    await this.push(tab)
  }
  async remove(removeInfo: chrome.tabs.TabRemoveInfo) {
    await this.nextTick();
    const res = await fetch(this.url, { method: 'DELETE' })
    await res.body?.cancel()
    this.dispatchEvent(new CustomEvent('removed', { detail: [removeInfo] }))
  }

  async save() {
    const items = { [this.url]: this.tabId }
    await chrome.storage.local.set(items)
    this.dispatchEvent(new CustomEvent('saved', { detail: items }))
  }

  toJSON() {
    return `Synchronizer: ${this.url} <=> ${this.tabId}`
  }
}
