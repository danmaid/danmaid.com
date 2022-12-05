export class Payment extends EventTarget {
  id?: string
  date?: string
  partner?: string
  item?: string
  price?: string
  method?: string
  receipt?: string

  set(v: Partial<Payment>) {
    Object.assign(this, v)
  }

  async load(id = this.id) {
    if (!id) return
    const res = await fetch(`/payments/${id}`, { headers: { Accept: 'application/json' } })
    if (!res.ok) return
    const payment = await res.json()
    this.set(payment)
    this.dispatchEvent(new Event('loaded'))
  }

  async save() {
    await (this.id ? this.update() : this.create())
    this.dispatchEvent(new Event('saved'))
  }

  async create() {
    const res = await fetch('/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this),
    })
    if (!res.ok) throw res
    this.id = await res.json()
    this.dispatchEvent(new Event('created'))
  }

  async update() {
    const id = this.id
    if (!id) return
    const res = await fetch(`/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this),
    })
    if (!res.ok) throw res
    this.dispatchEvent(new Event('updated'))
  }

  async delete() {
    const id = this.id
    if (!id) return
    const res = await fetch(`/payments/${id}`, { method: 'DELETE' })
    if (!res.ok) throw res
    this.dispatchEvent(new Event('deleted'))
  }
}
