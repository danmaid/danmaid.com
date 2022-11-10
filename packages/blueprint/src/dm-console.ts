interface DmConsole {
  addEventListener(type: 'output', listener: (ev: MessageEvent) => any): void
  addEventListener(type: unknown, listener: unknown, options?: unknown): void
}

class DmConsole extends HTMLElement {
  output: HTMLElement
  outputSlot: HTMLSlotElement
  size = 0

  constructor() {
    super()
    const root = this.attachShadow({ mode: 'open' })
    root.innerHTML = `
      <div id="output"></div>
      <div id="input"><slot name="input"></slot></div>
      <template id="out"><slot name="output"></slot></template>
      <style>
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        #output {
          flex: 1 0;
          background-color: #00f3;
          display: flex;
          flex-direction: column-reverse;
          overflow: auto;
          word-break: break-all;
        }
        #input {
          flex: 0 0;
          background-color: #0f03;
        }
      </style>
    `
    const output = root.getElementById('output')
    const outputSlot = root.querySelector('slot[name="output"]')
    console.log(outputSlot)
    if (!output) throw Error('invalid template')
    this.output = output
    this.outputSlot = outputSlot as HTMLSlotElement

    this.addEventListener('output', (ev) => {
      console.log('onoutput', ev)
      this.size++
      const slot: HTMLSlotElement & { value?: unknown } = document.createElement('slot')
      slot.name = `output-${this.size}`
      slot.value = ev.data
      output.append(slot)
      const children = this.outputSlot?.assignedElements() || []
      if (children.length > 0) {
        children.forEach((v) => {
          const child = v.cloneNode(true) as Element
          child.slot = `output-${this.size}`
          this.append(child)
        })
      } else {
        const div = document.createElement('div')
        div.append(JSON.stringify(ev.data))
        div.slot = `output-${this.size}`
        this.append(div)
      }
    })
  }

  connectedCallback() {
    setTimeout(() => {
      const root = this.shadowRoot
      if (!root) return
      console.log('connectedCallback')
      console.log('tmpl', root.querySelector('template#out'))
      const o1 = (root.querySelector('template#out') as HTMLTemplateElement).content.cloneNode(true) as HTMLElement
      const o2 = (root.querySelector('template#out') as HTMLTemplateElement).content.cloneNode(true) as HTMLElement
      console.log('o1', o1.innerHTML)
      console.log('o2', o2.innerHTML)
    }, 1000)
  }
}

customElements.define('dm-console', DmConsole)
