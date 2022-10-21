import { core, Event, resolveAll } from './core'
import { IndexedEvent } from './pathIndex'
import './pathIndex'

it('', async () => {
  const id = new Date().toISOString()
  const event = {
    id,
    type: 'created',
    path: `/xxx/yyy/${id}`,
  }
  const events: Event[] = []
  core.on(resolveAll, (ev) => events.push(ev))
  core.emit(event)

  await new Promise((r) => setTimeout(r, 1000))
  console.log(events)
})
