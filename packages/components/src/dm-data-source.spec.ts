import { DmDataSource } from './dm-data-source'

globalThis.fetch = jest.fn()
globalThis.EventSource = jest.createMockFromModule('eventsource')
const load = jest.spyOn(DmDataSource.prototype, 'load')
const connect = jest.spyOn(DmDataSource.prototype, 'connect')
const disconnect = jest.spyOn(DmDataSource.prototype, 'disconnect')

it('createElement -> 何もしない', async () => {
  const ds = document.createElement('dm-data-source') as DmDataSource
  expect(ds).toBeInstanceOf(DmDataSource)
  expect(ds.items).toStrictEqual([])
  expect(ds.eventSource).toBeUndefined()
  expect(load).not.toBeCalled()
  expect(connect).not.toBeCalled()
  expect(disconnect).not.toBeCalled()
})

it('<dm-data-source> -> 何もしない', async () => {
  document.body.innerHTML = `<dm-data-source id="ds"></dm-data-source>`
  const ds = document.getElementById('ds') as DmDataSource
  expect(ds.items).toStrictEqual([])
  expect(ds.eventSource).toBeUndefined()
  expect(load).not.toBeCalled()
  expect(connect).not.toBeCalled()
  expect(disconnect).not.toBeCalled()
})

it('<dm-data-source src="/"> -> 初期値がロードされること', async () => {
  const value = [{ id: '1' }, { id: '2' }]
  const res = { ok: true, json: jest.fn().mockResolvedValueOnce(Array.from(value)) }
  jest.mocked(fetch).mockResolvedValueOnce(res as any)
  document.body.innerHTML = `<dm-data-source id="ds" src="/"></dm-data-source>`
  const ds = document.getElementById('ds') as DmDataSource
  const loaded = new Promise((r) => ds.addEventListener('loaded', r))
  expect(ds.items).toStrictEqual([])
  expect(load).toBeCalled()
  expect(fetch).toBeCalled()
  await expect(loaded).resolves.toBeInstanceOf(Event)
  expect(ds.items).toStrictEqual(value)
  expect(ds.eventSource).toBeUndefined()
})

it('<dm-data-source src="/" live> -> SSE 接続すること', async () => {
  jest.mocked(fetch).mockResolvedValueOnce({ ok: true, json: jest.fn() } as any)
  document.body.innerHTML = `<dm-data-source id="ds" src="/" live></dm-data-source>`
  const ds = document.getElementById('ds') as DmDataSource
  const connected = new Promise((r) => ds.addEventListener('connected', r))
  expect(ds.eventSource).toBeInstanceOf(EventSource)
  if (ds.eventSource?.onopen) ds.eventSource.onopen(new Event('open'))
  await expect(connected).resolves.toBeInstanceOf(Event)
})

it('<dm-data-source src="/" live> -> タグ削除時に SSE 切断すること', async () => {
  jest.mocked(fetch).mockResolvedValueOnce({ ok: true, json: jest.fn() } as any)
  document.body.innerHTML = `<dm-data-source id="ds" src="/" live></dm-data-source>`
  const ds = document.getElementById('ds') as DmDataSource
  const disconnected = new Promise((r) => ds.addEventListener('disconnected', r))
  expect(ds.eventSource).toBeInstanceOf(EventSource)
  document.body.innerHTML = ''
  await expect(disconnected).resolves.toBeInstanceOf(Event)
})

it('<dm-data-source src="/" live> -> live 属性削除時に SSE 切断すること', async () => {
  jest.mocked(fetch).mockResolvedValueOnce({ ok: true, json: jest.fn() } as any)
  document.body.innerHTML = `<dm-data-source id="ds" src="/" live></dm-data-source>`
  const ds = document.getElementById('ds') as DmDataSource
  const disconnected = new Promise((r) => ds.addEventListener('disconnected', r))
  expect(ds.eventSource).toBeInstanceOf(EventSource)
  ds.toggleAttribute('live', false)
  await expect(disconnected).resolves.toBeInstanceOf(Event)
})

it('_id のないイベントは無視すること', async () => {
  jest.mocked(fetch).mockResolvedValueOnce({ ok: true, json: jest.fn() } as any)
  document.body.innerHTML = `<dm-data-source id="ds" src="/" live></dm-data-source>`
  const ds = document.getElementById('ds') as DmDataSource
  const event = new Promise((r) => ds.addEventListener('event', r))
  expect(ds.eventSource).toBeInstanceOf(EventSource)
  const data = JSON.stringify({})
  if (ds.eventSource?.onmessage) ds.eventSource.onmessage(new MessageEvent('message', { data }))
  await expect(event).resolves.toBeInstanceOf(MessageEvent)
})
