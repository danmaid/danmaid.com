import { DmEditPaymentTableRow, PaymentTable } from './DmPaymentTable.js'
import { Payment } from './Payment.js'

class DmPaymentTable extends PaymentTable {
  constructor() {
    super()
    this.addEventListener('click:refresh', () => this.onclickRefresh())
  }

  onclickRefresh() {
    this.clear()
    this.load()
  }

  async load() {
    const res = await fetch('/payments', { headers: { Accept: 'application/json' } })
    if (!res.ok) throw res
    const items: any[] = await res.json()
    items.forEach((v) => this.add(v))
  }
}

customElements.define('dm-edit-payment-table-row', DmEditPaymentTableRow, { extends: 'tr' })
customElements.define('dm-payment-table', DmPaymentTable, { extends: 'table' })
