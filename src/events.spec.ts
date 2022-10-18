import { events } from './events'

it('取得 存在しない', async () => {
  await expect(events.get('nothing')).rejects.toBeUndefined()
})

it('追加', async () => {
  await expect(events.add({})).resolves.toMatch(/^[\w-]+$/)
})

it('取得', async () => {
  const id = await events.add({})
  const event = await events.get(id)
  expect(event).toHaveProperty('id', id)
  expect(event).toHaveProperty('type', 'created')
  expect(event).toHaveProperty('date', expect.any(Date))
})

it('追加時にイベントが発火されること', async () => {
  const resolver = new Promise((r) => events.on('event', r))
  const id = await events.add({})
  const event = await resolver
  expect(event).toHaveProperty('id', id)
  expect(event).toHaveProperty('type', 'created')
  expect(event).toHaveProperty('date', expect.any(Date))
})

it('フィルタ 全件取得', async () => {
  const e = await events.filter(() => true)
  expect(e).toBeInstanceOf(Array)
  expect(e.length).toBeGreaterThanOrEqual(2)
})

it('フィルタ', async () => {
  const title = new Date().toISOString()
  await events.add({ title })
  await events.add({})
  const e = await events.filter((event) => event.title === title)
  expect(e).toBeInstanceOf(Array)
  expect(e.length).toBe(1)
})
