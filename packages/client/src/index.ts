if (!globalThis.EventSource) {
  globalThis.EventSource = require('eventsource')
}

export class ManagedObject<T extends Record<string, unknown>> extends EventTarget {
  value: T
  indeterminate?: true = true
  url: URL
  constructor(url: string, init: T = {} as T) {
    super()
    this.value = init
    this.url = new URL(url, 'https://danmaid.com')
    this.load()
    this.connect()
  }

  async fetch() {
    try {
      this.indeterminate = true
      const res = await fetch(this.url, { headers: { accept: 'application/json' } })
      this.value = await res.json()
      delete this.indeterminate
    } catch (err) {
      console.error(err)
    }
  }

  async load() {
    await this.fetch()
    this.dispatchEvent(new Event('loaded'))
  }

  connect() {
    new EventSource(this.url.href).addEventListener('change', async () => {
      await this.fetch()
      this.dispatchEvent(new Event('change'))
    })
  }
}
