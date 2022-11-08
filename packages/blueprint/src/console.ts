class DmConsole extends HTMLElement {
  out: HTMLElement
  created?: EventSource
  #src?: EventSource
  get src(): EventSource | undefined {
    return this.#src
  }
  set src(v: EventSource | undefined) {
    this.#src = v
    if (v) v.addEventListener('message', this.#onmessage)
  }

  constructor() {
    super()
    const root = this.attachShadow({ mode: 'open' })
    root.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%">
        <div id="out" style="flex: 1 0; background-color: #00f3; display: flex; flex-direction: column-reverse; overflow: auto; word-break: break-all"></div>
        <div style="flex: 0 0; background-color: #0f03"><slot name="input"></slot></div>
      </div>
    `
    const out = root.getElementById('out')
    if (!out) throw Error('out element not found.')
    this.out = out
  }

  connectedCallback() {
    if (!this.isConnected) return
    const url = this.getAttribute('src')
    if (url) this.src = this.created = new EventSource(url)
  }

  disconnectedCallback() {
    if (this.src) this.src.removeEventListener('message', this.#onmessage)
    if (this.src === this.created) this.src?.close()
  }

  #onmessage = async (ev: MessageEvent) => {
    const elem = await this.onmessage(ev)
    if (elem) this.out.prepend(elem)
  }
  onmessage = async (ev: MessageEvent): Promise<HTMLElement | void> => {
    const div = document.createElement('div')
    div.textContent = ev.data
    return div
  }

  clear() {
    this.out.innerHTML = ''
  }
}

customElements.define('dm-console', DmConsole)
