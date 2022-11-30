import { DmDataView } from './dm-data-view'
import { DmDataSource } from './dm-data-source'

const render = jest.spyOn(DmDataView.prototype, 'render')
const renderItem = jest.spyOn(DmDataView.prototype, 'renderItem')

it('createElement -> 何もしない', async () => {
  const ds = document.createElement('dm-data-view') as DmDataView
  expect(ds).toBeInstanceOf(DmDataView)
  expect(ds.source).toBeUndefined()
  expect(render).not.toBeCalled()
  expect(renderItem).not.toBeCalled()
})

it('未ロードのソースがセットされた場合、アイテムを描画しないこと', async () => {
  const ds = document.createElement('dm-data-view') as DmDataView
  ds.source = new DmDataSource()
  expect(render).toBeCalled()
  expect(renderItem).not.toBeCalled()
})

it('ロード済みのソースがセットされた場合、全体を描画すること', async () => {
  const source = new DmDataSource()
  source.items = [{ k: 'v1' }, { k: 'v2' }]
  const ds = document.createElement('dm-data-view') as DmDataView
  ds.source = source
  expect(render).toBeCalledTimes(1)
  expect(renderItem).toBeCalledTimes(2)
})

it('ソースで loaded イベントが発生した場合、全体を描画すること', async () => {
  const source = new DmDataSource()
  const ds = document.createElement('dm-data-view') as DmDataView
  ds.source = source
  expect(render).toBeCalledTimes(1)
  expect(renderItem).not.toBeCalled()
  source.items = [{ k: 'v1' }, { k: 'v2' }]
  source.dispatchEvent(new Event('loaded'))
  expect(render).toBeCalledTimes(2)
  expect(renderItem).toBeCalledTimes(2)
})

it('ソースで event イベントが発生した場合、アイテムを描画すること', async () => {
  const source = new DmDataSource()
  const ds = document.createElement('dm-data-view') as DmDataView
  ds.source = source
  expect(render).toBeCalledTimes(1)
  expect(renderItem).not.toBeCalled()
  source.items.push({ k: 'v1' })
  source.dispatchEvent(new Event('event'))
  expect(render).toBeCalledTimes(1)
  expect(renderItem).toBeCalledTimes(1)
})
