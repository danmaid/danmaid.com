import { DmDataSource } from './dm-data-source'
import { DmDataTable } from './dm-data-table'

it('table を保持すること', async () => {
  const ds = document.createElement('dm-data-table') as DmDataTable
  expect(ds).toBeInstanceOf(DmDataTable)
  expect(ds.shadowRoot?.querySelectorAll('table')).toHaveLength(1)
  expect(ds.shadowRoot?.querySelectorAll('table tbody')).toHaveLength(1)
  expect(ds.shadowRoot?.querySelectorAll('table thead')).toHaveLength(1)
})

it('clear 時、 tbody の中身を削除すること', async () => {
  const ds = document.createElement('dm-data-table') as DmDataTable
  ds.tbody.innerHTML = '<tr></tr><tr></tr>'
  expect(ds.shadowRoot?.querySelectorAll('table tbody tr')).toHaveLength(2)
  ds.clear()
  expect(ds.shadowRoot?.querySelectorAll('table tbody tr')).toHaveLength(0)
})

it('_id をキーに 行 を描画すること', async () => {
  const source = new DmDataSource<{ _id: string }>()
  source.items = [{ _id: 'k1' }, { _id: 'k2' }, { _id: 'k1' }]
  const ds = document.createElement('dm-data-table') as DmDataTable
  ds.source = source
  expect(ds.shadowRoot?.querySelectorAll('table tbody tr')).toHaveLength(2)
})

it("アイテムが type: 'deleted' の場合、行を削除すること", async () => {
  const source = new DmDataSource<{ _id: string; type?: string }>()
  source.items = [{ _id: 'k1' }, { _id: 'k2' }, { _id: 'k1', type: 'deleted' }]
  const ds = document.createElement('dm-data-table') as DmDataTable
  ds.source = source
  expect(ds.shadowRoot?.querySelectorAll('table tbody tr')).toHaveLength(1)
})
