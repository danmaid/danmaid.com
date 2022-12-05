function createButton(text: string, click?: EventListener): HTMLButtonElement {
  const button = document.createElement('button')
  button.textContent = text
  if (click) button.onclick = click
  return button
}

function wrapTd(...nodes: Parameters<HTMLTableCellElement['append']>): HTMLTableCellElement {
  const td = document.createElement('td')
  td.append(...nodes)
  return td
}

interface Payment {
  date: string
  partner: string
  item: string
  price: string
  method: string
  receipt: string
}

export class PaymentTable<T extends Payment & { id?: string } = Payment & { id?: string }> extends HTMLTableElement {
  thead = document.createElement('thead')
  headerRow = document.createElement('tr')
  refreshButton = createButton('refresh', () => this.dispatchEvent(new Event(`click:refresh`)))
  addRow = document.createElement('tr', { is: 'dm-edit-payment-table-row' })
  addButton = createButton('add', () => this.dispatchEvent(new Event(`click:add`)))
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
    this.headerRow.append(wrapTd(this.refreshButton))
    this.addRow.append(this.addButton)
    this.thead.append(this.headerRow, this.addRow)
    this.append(this.thead, this.tbody)
    this.addEventListener('click:refresh', () => console.log('click:refresh'))
    this.addEventListener('click:add', () => console.log('click:add'))
  }

  clear() {
    this.tbody.innerHTML = ''
  }

  add({ date, partner, item, price, method, receipt, id }: T) {
    const tr = document.createElement('tr')
    if (id) tr.id = id
    else tr.classList.add('partial')
    const columns = [date, partner, item, price, method, receipt].map((v) => wrapTd(v))
    tr.append(...columns)
    this.tbody.append(tr)
  }
}

export class DmEditPaymentTableRow extends HTMLTableRowElement {
  date = document.createElement('input')
  partner = document.createElement('input')
  item = document.createElement('input')
  price = document.createElement('input')
  method = document.createElement('input')
  receipt = document.createElement('input')

  constructor() {
    super()
    const { date, partner, item, price, method, receipt } = this
    const columns = [date, partner, item, price, method, receipt].map((v) => wrapTd(v))
    this.append(...columns)
  }
}
