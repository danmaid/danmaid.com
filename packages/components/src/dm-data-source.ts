export class DmDataSource<T extends Record<string, unknown> = Record<string, unknown>> extends HTMLElement {
  static get observedAttributes() {
    return ['src', 'live']
  }
  items: T[] = []
  eventSource?: EventSource

  constructor() {
    super()
    this.addEventListener('event', (ev) => this.onevent(ev))
  }

  attributeChangedCallback(name: 'src' | 'live', oldValue: string | null, newValue: string | null) {
    if (name === 'src' && newValue) return this.load()
    if (name === 'live') return newValue != null ? this.connect() : this.disconnect()
  }

  disconnectedCallback() {
    this.disconnect()
  }

  async load() {
    const src = this.getAttribute('src')
    if (!src) throw Error('src not found.')
    const res = await fetch(src, { headers: { Accept: 'application/json' } })
    if (!res.ok) return
    this.items = await res.json()
    this.dispatchEvent(new Event('loaded'))
  }

  connect() {
    const src = this.getAttribute('src')
    if (!src) throw Error('src not found.')
    const es = new EventSource(src)
    es.onopen = () => this.dispatchEvent(new Event('connected'))
    es.onmessage = ({ data }) => this.dispatchEvent(new MessageEvent<T>('event', { data: JSON.parse(data) }))
    this.eventSource = es
  }

  disconnect() {
    const { eventSource } = this
    if (!eventSource) return
    eventSource.close()
    eventSource.onopen = null
    eventSource.onerror = null
    eventSource.onmessage = null
    this.eventSource = undefined
    this.dispatchEvent(new Event('disconnected'))
  }

  onevent({ data }: MessageEvent<T>) {
    if (!data._id) return
    if (data.type === 'created' || data.type === 'added') {
      this.items.push(data)
      this.dispatchEvent(new Event('update:items'))
    } else if (data.type === 'updated') {
      const index = this.items.findIndex((v) => v._id === data._id)
      if (index < 0) return
      this.items.splice(index, 1, data)
      this.dispatchEvent(new Event('update:items'))
    } else if (data.type === 'deleted' || data.type === 'removed') {
      const index = this.items.findIndex((v) => v._id === data._id)
      if (index < 0) return
      this.items.splice(index, 1)
      this.dispatchEvent(new Event('update:items'))
    }
  }
}

customElements.define('dm-data-source', DmDataSource)

interface DmDataSourceEventMap<T extends Record<string, unknown> = Record<string, unknown>> {
  loaded: Event
  connected: Event
  disconnected: Event
  event: MessageEvent<T>
}

export interface DmDataSource<T extends Record<string, unknown> = Record<string, unknown>> {
  addEventListener<K extends keyof DmDataSourceEventMap<T>>(
    type: K,
    listener: (this: DmDataSource<T>, ev: DmDataSourceEventMap<T>[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void
  removeEventListener<K extends keyof DmDataSourceEventMap<T>>(
    type: K,
    listener: (this: DmDataSource<T>, ev: DmDataSourceEventMap<T>[K]) => any,
    options?: boolean | EventListenerOptions
  ): void
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void
}