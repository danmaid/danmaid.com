import { PaymentTable } from './PaymentTable.js'
import { PaymentTableRow } from './PaymentTableRow.js'

interface Payment {
  date: string
  partner: string
  item: string
  price: string
  method: string
  receipt: string
}

class DmPaymentTable extends PaymentTable {
  constructor() {
    super()
    this.addEventListener('refresh', () => this.onrefresh())
    this.addEventListener('create', (ev) => this.oncreate(ev))
    this.addEventListener('update', (ev) => this.onupdate(ev))
    this.addEventListener('delete', (ev) => this.ondelete(ev))
  }

  onrefresh() {
    this.clear()
    this.load()
  }

  async oncreate({ detail: tr }: CustomEvent<PaymentTableRow>) {
    if (!tr.value) return
    tr.id = await this.create(tr.value)
    tr.removeAttribute('partial')
  }

  async onupdate({ detail: tr }: CustomEvent<PaymentTableRow>) {
    if (!tr.id || !tr.value) return
    await this.update(tr.id, tr.value)
    tr.removeAttribute('partial')
  }

  async ondelete({ detail: tr }: CustomEvent<PaymentTableRow>) {
    if (!tr.id) return
    await this.delete(tr.id)
    tr.remove()
  }

  async load() {
    const res = await fetch('/payments', { headers: { Accept: 'application/json' } })
    if (!res.ok) throw res
    const items: any[] = await res.json()
    items.forEach((v) => this.add(v))
  }

  async create(v: Payment): Promise<string> {
    const res = await fetch('/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(v),
    })
    if (!res.ok) throw res
    return await res.json()
  }

  async update(id: string, v: Payment): Promise<void> {
    const res = await fetch(`/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v),
    })
    if (!res.ok) throw res
  }

  async delete(id: string): Promise<void> {
    const res = await fetch(`/payments/${id}`, { method: 'DELETE' })
    if (!res.ok) throw res
  }
}

customElements.define('dm-payment-table-row', PaymentTableRow, { extends: 'tr' })
customElements.define('dm-payment-table', DmPaymentTable, { extends: 'table' })
