import { DmDataView } from './dm-data-view'

export class DmDataTable<
  T extends Record<string, unknown> & { _id: string } = Record<string, unknown> & { _id: string }
> extends DmDataView<T> {
  items: T[] = []
  table = document.createElement('table')
  thead = document.createElement('thead')
  tbody = document.createElement('tbody')

  constructor() {
    super()
    this.table.append(this.thead, this.tbody)
    this.root.append(this.table)
  }

  clear() {
    this.tbody.innerHTML = ''
  }

  renderItem(item: T & { type?: 'deleted' }) {
    const id = item._id
    const index = this.items.findIndex((v) => v._id === id)
    if (index >= 0) {
      const row = this.tbody.querySelector(`tr#${id}`)
      if (item.type === 'deleted') {
        this.items.splice(index, 1)
        row?.remove()
      } else {
        this.items.splice(index, 1, item)
        row?.replaceWith(this.createRow(item))
      }
    } else {
      this.items.push(item)
      this.tbody.append(this.createRow(item))
    }
  }

  createRow(item: T): HTMLTableRowElement {
    const tr = document.createElement('tr')
    tr.textContent = JSON.stringify(item)
    tr.id = item._id
    return tr
  }
}

customElements.define('dm-data-table', DmDataTable)
