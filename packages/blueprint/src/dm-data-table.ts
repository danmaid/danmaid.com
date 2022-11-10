class DmDataTable extends HTMLElement {
  root: ShadowRoot
  #headers: string[]
  get headers() {
    return this.#headers
  }
  #items: any[] = [
    { x: 1, y: 'a', z: true },
    { x: 2, y: 'b', z: false },
  ]
  get items() {
    return this.#items
  }
  set items(v) {
    this.#items = v
    this.#headers = this.computeHeaders(v)
    this.reload()
  }

  constructor() {
    super()
    const root = this.attachShadow({ mode: 'open' })
    root.innerHTML = `
      <table>
        <thead id="thead"></thead>
        <tbody id="tbody"></tbody>
      </table>
    `

    this.root = root
    this.#headers = this.computeHeaders(this.items)
    root.children
  }

  connectedCallback() {
    if (!this.isConnected) return
    this.load()
  }

  async load(url = this.getAttribute('src')) {
    if (!url) return
    const res = await fetch(url)
    this.items = await res.json()
  }

  computeHeaders(v: any[]) {
    return v.reduce((acc, c) => {
      return Object.keys(c).reduce((a, c) => a.add(c), acc)
    }, new Set())
  }

  resetHeader() {
    const thead = this.root.getElementById('thead')
    if (!thead) return
    thead.innerHTML = ''
    this.headers.forEach((v) => {
      const th = document.createElement('th')
      th.append(v)
      thead.append(th)
    })
  }

  reload() {
    this.resetHeader()
    const tbody = this.root.getElementById('tbody')
    if (!tbody) return
    tbody.innerHTML = ''
    this.items.forEach((v, i) => {
      const tr = document.createElement('tr')
      this.headers.forEach((h) => {
        const td = document.createElement('td')
        td.append(v[h])
        tr.append(td)
      })
      tbody.append(tr)
    })
  }
}

customElements.define('dm-data-table', DmDataTable)
