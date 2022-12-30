class DmFormData extends FormData {
  toJSON() {
    const record: Record<string, FormDataEntryValue> = {}
    this.forEach((v, k) => (record[k] = v))
    return record
  }
}

class DmSend extends HTMLElement {
  form: HTMLFormElement

  constructor() {
    super()
    const root = this.attachShadow({ mode: 'open' })
    root.innerHTML = `
      <form id="form" style="display: flex">
        <slot><input name="value" style="flex: 1 1" /></slot>
        <input type="submit" />
      </form>
    `
    this.form = root.getElementById('form') as HTMLFormElement
    this.form.onsubmit = (ev) => this.onsubmit(ev)
  }

  onsubmit = async (ev: Event) => {
    ev.preventDefault()
    const data = new DmFormData(this.form)
    console.log(JSON.stringify(data))
    const res = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) this.form.reset()
  }
}

customElements.define('dm-send', DmSend)
