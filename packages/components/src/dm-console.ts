import { DmDataView } from './dm-data-view.js'

export class DmConsole<T extends Record<string, unknown> = Record<string, unknown>> extends DmDataView<T> {
  views = []
  wrapper = document.createElement('div')
  output = document.createElement('div')
  input = document.createElement('div')

  constructor() {
    super()
    this.wrapper.style.display = 'flex'
    this.wrapper.style.flexDirection = 'column'
    this.wrapper.style.height = '100%'
    this.output.style.flex = '1 0'
    this.output.style.backgroundColor = '#00f3'
    this.output.style.overflow = 'auto'
    this.output.style.whiteSpace = 'nowrap'
    this.input.style.flex = '0 0'
    this.input.style.backgroundColor = '#0f03'
    this.input.innerHTML = '<slot name="input"></slot>'
    this.wrapper.append(this.output, this.input)
    this.root.append(this.wrapper)
  }

  clear() {}

  renderItem(item: T) {
    const div = document.createElement('div')
    div.textContent = JSON.stringify(item)
    this.output.append(div)
    div.scrollIntoView(false)
  }
}

customElements.define('dm-console', DmConsole)
