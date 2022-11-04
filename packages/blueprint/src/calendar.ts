class DmCalendar extends HTMLElement {
  root: ShadowRoot
  #baseDate = new Date()
  get baseDate(): Date {
    return this.#baseDate
  }
  set baseDate(v: Date) {
    this.#baseDate = v
    this.render()
  }
  html: string = `
    <div
      id="cal"
      style="
        height: 100%;
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        grid-template-rows: auto;
        grid-auto-rows: 1fr;
      "
    >
      <div style="border: 1px solid">月</div>
      <div style="border: 1px solid">火</div>
      <div style="border: 1px solid">水</div>
      <div style="border: 1px solid">木</div>
      <div style="border: 1px solid">金</div>
      <div style="border: 1px solid">土</div>
      <div style="border: 1px solid">日</div>
    </div>
  `

  constructor() {
    super()
    const root = this.attachShadow({ mode: 'open' })
    root.innerHTML = this.html
    this.root = root
    this.render()
  }

  connectedCallback() {
    if (!this.isConnected) return
    const base = this.getAttribute('base-date')
    if (base) {
      const date = new Date(base)
      if (!!date.getTime()) this.baseDate = date
    }
  }

  getPaddingFirsts(base = new Date()) {
    const a = []
    const prevLast = new Date(new Date(base).setDate(0))
    for (let i = 0; i < prevLast.getDay(); i++) {
      a.unshift(new Date(new Date(base).setDate(-i)))
    }
    return a
  }
  getPaddingLasts(base = new Date()) {
    const a = []
    const nextFirst = new Date(base)
    nextFirst.setMonth(nextFirst.getMonth() + 1)
    nextFirst.setDate(1)
    for (let i = 1; i <= 8 - nextFirst.getDay(); i++) {
      a.push(new Date(new Date(nextFirst).setDate(i)))
    }
    return a
  }
  getDates(base = new Date()) {
    const a = []
    const first = new Date(base)
    first.setDate(1)
    const next = new Date(first)
    next.setMonth(base.getMonth() + 1)
    for (const date = new Date(first); date < next; date.setDate(date.getDate() + 1)) {
      a.push(new Date(date))
    }
    return a
  }

  getDateKey(date: Date): string {
    const YYYY = date.getFullYear()
    const MM = String(date.getMonth() + 1).padStart(2, '0')
    const DD = String(date.getDate()).padStart(2, '0')
    return `${YYYY}-${MM}-${DD}`
  }

  createDateElement(date: Date, formatter?: Intl.DateTimeFormat): HTMLElement {
    const div = document.createElement('div')
    const slot = document.createElement('slot')
    slot.name = this.getDateKey(date)
    slot.textContent = formatter ? formatter.format(date) : `${date.getDate()}`
    div.append(slot)
    return div
  }

  render() {
    this.root.innerHTML = this.html
    const cal = this.root.querySelector('#cal') as any

    const base = new Date(this.baseDate)
    base.setHours(0, 0, 0, 0)
    const padsFirst = this.getPaddingFirsts(base)
    padsFirst.forEach((v) => {
      const elem = this.createDateElement(v)
      elem.style.backgroundColor = '#00f2'
      cal.append(elem)
    })

    const first = new Intl.DateTimeFormat([], { month: 'long', day: 'numeric' })
    const dates = this.getDates(base)
    dates.forEach((v, i) => {
      const elem = this.createDateElement(v, i === 0 ? first : undefined)
      elem.style.backgroundColor = '#0f02'
      cal.append(elem)
    })

    const padsLast = this.getPaddingLasts(base)
    padsLast.forEach((v, i) => {
      const elem = this.createDateElement(v, i === 0 ? first : undefined)
      elem.style.backgroundColor = '#00f2'
      cal.append(elem)
    })
  }
}

customElements.define('dm-calendar', DmCalendar)
