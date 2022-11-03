class DmMatrixCode extends HTMLElement {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  renderers = new Set<() => boolean>()
  get width(): number {
    return this.canvas.width
  }
  set width(v: number) {
    this.canvas.width = v
  }
  get height(): number {
    return this.canvas.height
  }
  set height(v: number) {
    this.canvas.height = v
  }
  created?: EventSource
  #src?: EventSource
  get src(): EventSource | undefined {
    return this.#src
  }
  set src(v: EventSource | undefined) {
    this.#src = v
    if (v) v.addEventListener('message', this.onmessage)
  }

  constructor() {
    super()
    const root = this.attachShadow({ mode: 'open' })

    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    const context = canvas.getContext('2d')
    if (!context) throw Error('invalid context.')
    root.append(canvas)
    this.context = context
    this.canvas = canvas
  }

  timer?: number
  connectedCallback() {
    if (!this.isConnected) return clearInterval(this.timer)
    this.width = this.canvas.offsetWidth
    this.height = this.canvas.offsetHeight

    this.context.fillStyle = '#000'
    this.context.fillRect(0, 0, this.width, this.height)

    const url = this.getAttribute('src')
    if (url) this.src = this.created = new EventSource(url)

    this.timer = window.setInterval(() => {
      this.context.fillStyle = '#0001'
      this.context.fillRect(0, 0, this.width, this.height)
      this.renderers.forEach((r) => r() || this.renderers.delete(r))
    }, 50)
  }

  disconnectedCallback() {
    clearInterval(this.timer)
    if (this.src) this.src.removeEventListener('message', this.onmessage)
    if (this.src === this.created) this.src?.close()
  }

  render(text: string) {
    const { context } = this
    const chars = Array.from(text)
    const x = Math.random() * this.width
    let y = 0
    this.renderers.add(() => {
      const char = chars.shift()
      if (!char) return false
      context.fillStyle = '#aaF'
      context.font = '21px monospace'
      context.fillText(char, x, y)
      y += 20
      return y <= this.height
    })
  }

  onmessage = (ev: MessageEvent) => this.render(ev.data)
}

customElements.define('dm-matrix-code', DmMatrixCode)
