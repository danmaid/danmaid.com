import { MemEventStore } from './MemEventStore'

it('add -> filter', async () => {
  const store = new MemEventStore()
  const event = { x: 'x' }
  const _id = await store.add(event)
  const events = await store.filter(() => true)
  expect(events).toContainEqual({ ...event, _id })
})
