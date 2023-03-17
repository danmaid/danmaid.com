import QRCode from 'qrcode-svg'

class DmQRCode extends HTMLElement {
  static get observedAttributes() {
    return ['value']
  }

  qr = new QRCode('https://danmaid.com')

  constructor() {
    super()
    const root = this.attachShadow({ mode: 'open' })
    root.append(this.qr.canvas)
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === 'value') this.qr.value = newValue
  }
}

customElements.define('dm-qr-code', DmQRCode)
