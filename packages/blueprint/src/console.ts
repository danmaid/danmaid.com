class DmConsole extends HTMLElement {
  out: HTMLElement
  src?: EventSource

  constructor() {
    super()
    const root = this.attachShadow({ mode: 'open' })
    root.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%">
        <div id="out" style="flex: 1 0; background-color: #00f3; display: flex; flex-direction: column-reverse; overflow: auto; word-break: break-all"></div>
        <div style="flex: 0 0; background-color: #0f03"></div>
      </div>
    `
    const out = root.getElementById('out')
    if (!out) throw Error('')
    this.out = out
  }

  connectedCallback() {
    if (!this.isConnected) return
    const url = this.getAttribute('src')
    if (url) {
      this.src = new EventSource(url)
      this.src.onmessage = (ev) => this.onmessage(ev)
    }
  }

  disconnectedCallback() {
    this.src?.close()
  }

  onmessage(ev: MessageEvent) {
    const div = document.createElement('div')
    div.textContent = ev.data
    this.out.prepend(div)
  }

  clear() {
    this.out.innerHTML = ''
  }
}

customElements.define('dm-console', DmConsole)
