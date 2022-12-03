class DmWindow extends EventTarget {
  static count = 0
  id = `dm-window-${++DmWindow.count}`
  win?: WindowProxy | null
  url = ''
  left = window.screenLeft
  top = window.screenTop
  width = window.innerWidth
  height = window.innerHeight

  constructor() {
    super()
    window.addEventListener('unload', () => this.win?.close())
  }

  getSize(): string {
    return `left=${this.left},top=${this.top},width=${this.width},height=${this.height}`
  }

  resizerOpen() {
    this.win?.close()
    const win = window.open('about:blank', this.id, this.getSize())
    if (win) {
      win.onresize = () => this.save()
      win.onfocus = () => this.save()
      win.onblur = () => this.save()
    }
    this.win = win
  }

  load() {
    const data = localStorage.getItem(this.id)
    if (!data) return
    const config = JSON.parse(data)
    Object.assign(this, config)
    this.dispatchEvent(new Event('change'))
  }

  save() {
    if (this.win) {
      this.left = this.win.screenLeft
      this.top = this.win.screenTop
      this.width = this.win.innerWidth
      this.height = this.win.innerHeight
      this.dispatchEvent(new Event('change'))
    }
    const { url, left, top, width, height } = this
    localStorage.setItem(this.id, JSON.stringify({ url, left, top, width, height }))
  }

  open() {
    console.log(this)
    this.win?.close()
    this.win = window.open(this.url, this.id, this.getSize())
  }
}

class DmWindowTableRow extends HTMLTableRowElement {
  dmw = new DmWindow()
  #left: HTMLInputElement
  #top: HTMLInputElement
  #width: HTMLInputElement
  #height: HTMLInputElement
  #url: HTMLInputElement

  constructor() {
    super()
    this.innerHTML = `
      <td><input name="url" style="width: 500px" /></td>
      <td><input type="number" name="left" /></td>
      <td><input type="number" name="top" /></td>
      <td><input type="number" name="width" /></td>
      <td><input type="number" name="height" /></td>
      <td><button name="resizer">resizer</button></td>
      <td><button name="save">save</button></td>
      <td><button name="open">open</button></td>
      <style>
        input[type='number'] {
          width: 5em;
        }
      </style>
    `
    this.#url = this.querySelector('input[name="url"]') as HTMLInputElement
    this.#url.onchange = () => (this.dmw.url = this.#url.value)

    this.#left = this.querySelector('input[name="left"]') as HTMLInputElement
    this.#top = this.querySelector('input[name="top"]') as HTMLInputElement
    this.#width = this.querySelector('input[name="width"]') as HTMLInputElement
    this.#height = this.querySelector('input[name="height"]') as HTMLInputElement

    this.#left.onchange = () => (this.dmw.left = parseInt(this.#left.value))
    this.#top.onchange = () => (this.dmw.top = parseInt(this.#top.value))
    this.#width.onchange = () => (this.dmw.width = parseInt(this.#width.value))
    this.#height.onchange = () => (this.dmw.height = parseInt(this.#height.value))

    this.dmw.addEventListener('change', () => {
      this.#url.value = this.dmw.url
      this.#left.value = this.dmw.left.toString()
      this.#top.value = this.dmw.top.toString()
      this.#width.value = this.dmw.width.toString()
      this.#height.value = this.dmw.height.toString()
    })

    this.querySelector('button[name="resizer"]')?.addEventListener('click', () => this.dmw.resizerOpen())
    this.querySelector('button[name="save"]')?.addEventListener('click', () => this.dmw.save())
    this.querySelector('button[name="open"]')?.addEventListener('click', () => this.dmw.open())

    this.dmw.load()
  }
}

customElements.define('dm-window', DmWindowTableRow, { extends: 'tr' })
