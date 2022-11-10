class DmDataSource extends HTMLElement {
  items?: unknown[]
  events?: EventSource

  constructor() {
    super()
  }

  connectedCallback() {
    if (!this.isConnected) return
    this.load()
    this.connect()
  }

  disconnectedCallback() {
    this.items = undefined
    this.disconnect()
  }

  static get observedAttributes() {
    return ['src']
  }
  attributeChangedCallback(name: 'src', value?: string) {
    value ? this.connectedCallback() : this.disconnectedCallback()
  }

  async load() {
    const src = this.getAttribute('src')
    if (!src) return
    const res = await fetch(src, { headers: { Accept: 'application/json' } })
    if (!res.ok) return
    this.items = await res.json()
    this.dispatchEvent(new CustomEvent('loaded', { detail: this.items }))
  }

  connect() {
    const src = this.getAttribute('src')
    if (!src) return
    this.events = new EventSource(src)
    this.events.onopen = () => this.dispatchEvent(new CustomEvent('connected'))
    this.events.onerror = () => this.events?.readyState === EventSource.CLOSED && this.disconnect()
    this.events.onmessage = ({ data }) => this.dispatchEvent(new MessageEvent('event', { data: JSON.parse(data) }))
    this.events.addEventListener('message', (ev) => console.log('onmessage', ev))
  }

  disconnect() {
    const events = this.events
    if (!events) return
    events.close()
    events.onopen = null
    events.onerror = null
    events.onmessage = null
    this.events = undefined
    this.dispatchEvent(new CustomEvent('disconnected'))
  }
}

customElements.define('dm-data-source', DmDataSource)
