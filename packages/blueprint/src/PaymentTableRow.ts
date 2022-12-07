interface Payment {
  date: string
  partner: string
  item: string
  price: string
  method: string
  receipt: string
}

function createButton(text: string, click?: EventListener): HTMLButtonElement {
  const button = document.createElement('button')
  button.textContent = text
  if (click) button.onclick = click
  return button
}

export class PaymentTableRow extends HTMLTableRowElement {
  static get observedAttributes() {
    return ['edit', 'partial']
  }
  #value?: Payment
  date = document.createElement('td')
  partner = document.createElement('td')
  item = document.createElement('td')
  price = document.createElement('td')
  method = document.createElement('td')
  receipt = document.createElement('td')
  actions = document.createElement('td')
  edit = createButton('edit', () => this.toggleAttribute('edit', true))
  copy = createButton('copy', () => this.dispatchEvent(new Event('copy')))
  delete = createButton('delete', () => {
    this.dispatchEvent(new Event('delete'))
    this.toggleAttribute('partial', true)
  })
  commit = createButton('commit', () => {
    const value = this.value
    this.dispatchEvent(new Event('commit'))
    this.toggleAttribute('edit', false)
    this.value = value
    this.toggleAttribute('partial', true)
  })
  cancel = createButton('cancel', () => this.toggleAttribute('edit', false))
  inputDate = document.createElement('input')
  inputPartner = document.createElement('input')
  inputItem = document.createElement('input')
  inputPrice = document.createElement('input')
  inputMethod = document.createElement('input')
  inputReceipt = document.createElement('input')

  constructor() {
    super()
    this.append(this.date, this.partner, this.item, this.price, this.method, this.receipt, this.actions)
  }

  get value() {
    if (this.hasAttribute('edit'))
      return {
        date: this.inputDate.value,
        partner: this.inputPartner.value,
        item: this.inputItem.value,
        price: this.inputPrice.value,
        method: this.inputMethod.value,
        receipt: this.inputReceipt.value,
      }
    return this.#value
  }
  set value(v) {
    this.#value = v
    this.hasAttribute('edit') ? this.setEditor(v) : this.setValue(v)
  }

  setValue(v?: Payment) {
    this.date.textContent = v?.date || null
    this.partner.textContent = v?.partner || null
    this.item.textContent = v?.item || null
    this.price.textContent = v?.price || null
    this.method.textContent = v?.method || null
    this.receipt.textContent = v?.receipt || null
    this.actions.replaceChildren(this.edit, this.copy, this.delete)
  }

  setEditor(v?: Payment): void {
    this.inputDate.value = v?.date || ''
    this.inputPartner.value = v?.partner || ''
    this.inputItem.value = v?.item || ''
    this.inputPrice.value = v?.price || ''
    this.inputMethod.value = v?.method || ''
    this.inputReceipt.value = v?.receipt || ''
    this.date.replaceChildren(this.inputDate)
    this.partner.replaceChildren(this.inputPartner)
    this.item.replaceChildren(this.inputItem)
    this.price.replaceChildren(this.inputPrice)
    this.method.replaceChildren(this.inputMethod)
    this.receipt.replaceChildren(this.inputReceipt)
    this.actions.replaceChildren(this.commit, this.cancel)
  }

  replaceActions(...nodes: Parameters<HTMLElement['replaceChildren']>) {
    this.actions.replaceChildren(...nodes)
  }

  attributeChangedCallback(name: 'edit' | 'partial', oldValue: boolean, newValue: boolean) {
    if (name === 'edit') newValue !== null ? this.setEditor(this.#value) : this.setValue(this.#value)
    if (name === 'partial')
      if (newValue !== null) {
        this.edit.disabled = true
        this.copy.disabled = true
        this.delete.disabled = true
        this.commit.disabled = true
        this.cancel.disabled = true
      } else {
        this.edit.disabled = false
        this.copy.disabled = false
        this.delete.disabled = false
        this.commit.disabled = false
        this.cancel.disabled = false
      }
  }
}
