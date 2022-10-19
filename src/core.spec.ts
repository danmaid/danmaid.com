import { core } from './core'
import { EventMeta } from './events'
import { isEventMeta } from './events.spec'

it('emit 時、key, type が指定された場合、イベントを追加すること', async () => {
  const e = new Promise<EventMeta>((r) => core.once('event', r))
  core.emit('request', { value: 'value' }, 'test')
  const event = await e
  expect(isEventMeta(event)).toBe(true)
  expect(event).toMatchObject({ value: 'value', request: 'test' })
})
