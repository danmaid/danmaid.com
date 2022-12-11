class DmSvg extends HTMLElement {
  static get observedAttributes() {
    return ['src']
  }

  object = document.createElement('object')

  constructor() {
    super()
    this.object.type = 'image/svg+xml'
    this.object.onload = () => {
      const root = this.object.contentDocument?.documentElement
      if (!root) return
      Array.from(this.attributes)
        .filter((v) => v.name !== 'src')
        .forEach((v) => root.setAttribute(v.name, v.value))
    }
    this.append(this.object)
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    this.object.data = newValue
  }
}

customElements.define('dm-svg', DmSvg)
