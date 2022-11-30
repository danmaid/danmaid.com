import { DmDataSource } from './dm-data-source.js'

export class DmDataView<T extends Record<string, unknown> = Record<string, unknown>> extends HTMLElement {
  root = this.attachShadow({ mode: 'open' })
  #source?: DmDataSource<T>
  get source() {
    return this.#source
  }
  set source(v) {
    this.#source = v
    if (!this.source) return
    this.render()
    this.source.addEventListener('loaded', () => this.render())
    this.source.addEventListener('event', ({ data }) => this.renderItem(data))
  }

  clear() {
    this.root.innerHTML = ''
  }

  render() {
    const { source: value } = this
    if (!value) return
    this.clear()
    for (const item of value) this.renderItem(item)
  }

  renderItem(item: T) {
    const div = document.createElement('div')
    div.textContent = JSON.stringify(item)
    this.root.append(div)
  }
}

customElements.define('dm-data-view', DmDataView)
