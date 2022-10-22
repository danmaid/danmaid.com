import { core, Event, resolveAll } from './core'
import { getIndex, createIndex } from './pathIndex'
import { join } from 'path'

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

describe('getIndexPath', () => {
  function getIndexPath(path: string): string {
    return path.replace(/\/[^/]*$/, '')
  }

  it('/xxx/yyy/zzz -> /xxx/yyy', async () => {
    expect(getIndexPath('/xxx/yyy/zzz')).toBe('/xxx/yyy')
  })

  it('/xxx/yyy/zzz/ -> /xxx/yyy/zzz/', async () => {
    expect(getIndexPath('/xxx/yyy/zzz/')).toBe('/xxx/yyy/zzz')
  })

  it('xxx/yyy/zzz -> xxx/yyy', async () => {
    expect(getIndexPath('xxx/yyy/zzz')).toBe('xxx/yyy')
  })

  it('join("/xxx/yyy/zzz", "hoge") -> join("/xxx/yyy/hoge")', async () => {
    expect(join(getIndexPath('/xxx/yyy/zzz'), 'hoge')).toBe(join('/xxx/yyy/hoge'))
  })

  it('join("/xxx/yyy/zzz/", "hoge") -> join("/xxx/yyy/zzz/hoge")', async () => {
    expect(join(getIndexPath('/xxx/yyy/zzz/'), 'hoge')).toBe(join('/xxx/yyy/zzz/hoge'))
  })
})

describe('getIndex', () => {
  it('', async () => {
    await createIndex({ type: 'created', path: '/xxx/yyy/zzz' } as any)
    const a = await getIndex({ type: 'request', path: `/xxx/yyy/zzz` } as any)
    expect(a).toStrictEqual({ type: 'created', path: `/xxx/yyy/zzz`, id: 'zzz' })
  })
})
