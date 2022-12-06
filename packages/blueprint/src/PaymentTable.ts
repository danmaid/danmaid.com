import { PaymentTableRow } from './PaymentTableRow.js'

function createButton(text: string, click?: EventListener): HTMLButtonElement {
  const button = document.createElement('button')
  button.textContent = text
  if (click) button.onclick = click
  return button
}

interface Payment {
  date: string
  partner: string
  item: string
  price: string
  method: string
  receipt: string
}

export class PaymentTable extends HTMLTableElement {
  thead = document.createElement('thead')
  headerRow = document.createElement('tr')
  refreshButton = createButton('refresh', () => this.dispatchEvent(new Event(`refresh`)))
  addRow = new PaymentTableRow()
  addButton = createButton('add', () => {
    const value = this.addRow.value
    const tr = this.add(value)
    tr.toggleAttribute('partial', true)
    this.dispatchEvent(new CustomEvent('create', { detail: tr }))
  })
  clearButton = createButton('clear', () => {
    this.addRow.value = undefined
    this.addRow.replaceActions(this.addButton, this.clearButton)
  })
  tbody = document.createElement('tbody')

  constructor() {
    super()
    this.headerRow.innerHTML = `
      <th>日時</th>
      <th>相手</th>
      <th>品名</th>
      <th>価格</th>
      <th>支払方法</th>
      <th>レシート/領収書</th>
    `
    const actions = document.createElement('td')
    actions.append(this.refreshButton)
    this.headerRow.append(actions)
    this.addRow.toggleAttribute('edit', true)
    this.addRow.replaceActions(this.addButton, this.clearButton)
    this.thead.append(this.headerRow, this.addRow)
    this.append(this.thead, this.tbody)
  }

  clear() {
    this.tbody.innerHTML = ''
  }

  add(value?: Payment & { id?: string }): PaymentTableRow {
    const tr = new PaymentTableRow()
    tr.value = value
    if (value?.id) tr.id = value.id
    tr.addEventListener('copy', () => {
      this.addRow.value = tr.value
      this.addRow.replaceActions(this.addButton, this.clearButton)
    })
    tr.addEventListener('delete', () => this.dispatchEvent(new CustomEvent('delete', { detail: tr })))
    tr.addEventListener('commit', () => this.dispatchEvent(new CustomEvent('update', { detail: tr })))
    this.tbody.append(tr)
    return tr
  }
}

interface PaymentTableEventMap {
  refresh: CustomEvent<PaymentTableRow>
  create: CustomEvent<PaymentTableRow>
  update: CustomEvent<PaymentTableRow>
  delete: CustomEvent<PaymentTableRow>
}

export interface PaymentTable {
  addEventListener<K extends keyof PaymentTableEventMap>(
    type: K,
    listener: (this: PaymentTable, ev: PaymentTableEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions | undefined
  ): void
  removeEventListener<K extends keyof PaymentTableEventMap>(
    type: K,
    listener: (this: PaymentTable, ev: PaymentTableEventMap[K]) => any,
    options?: boolean | EventListenerOptions | undefined
  ): void
}
