import { DmDataView } from './dm-data-view.js'

export class DmConsole<T extends Record<string, unknown> = Record<string, unknown>> extends DmDataView<T> {
  views = []

  renderItem(item: T) {
    const view = this.views.find((v) => v)
    if (!view) return
    const r = document.createElement(view)
    const div = document.createElement('div')
    div.textContent = JSON.stringify(item)
    this.root.append(div)
  }
}

customElements.define('dm-console', DmConsole)
