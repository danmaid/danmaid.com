import './events'
import { core, Event } from './core'
import { filter, getContent } from './events'
import { Readable } from 'node:stream'

// export function isEventMeta(v: any): v is EventMeta {
//   expect(v).toHaveProperty('id', expect.stringMatching(/^[\w-]+$/))
//   expect(v).toHaveProperty('type', expect.stringMatching(/^\w+$/))
//   expect(v).toHaveProperty('date', expect.any(Date))
//   return true
// }

it('core のイベントが保存されること', async () => {
  const title = new Date().toISOString()
  core.emit<{ title: string } & Event>({ title })
  const events = await filter(() => true)
  expect(events).toContainEqual(expect.objectContaining({ title }))
})

it('core のコンテンツイベントが保存されること', async () => {
  const content = new Date().toISOString()
  core.emit<{ content: string } & Event>({ content })
  const events = await filter(() => true)
  expect(events).toContainEqual(expect.objectContaining({ content }))
})

it('core の Readable コンテンツイベントが保存されること', async () => {
  const text = new Date().toISOString()
  const content = Readable.from(text)
  core.emit<{ content: Readable; text: string } & Event>({ text, content })
  await new Promise((r) => setTimeout(r, 1000))
  const events = await filter((ev: { text: string } & Event) => ev.text === text)
  expect(events).toContainEqual(expect.objectContaining({ content: '[object Readable]' }))
  await Promise.all(
    events.map(async (v) => {
      const chunks = []
      for await (const chunk of getContent(v.id)) {
        chunks.push(Buffer.from(chunk))
      }
      const s = Buffer.concat(chunks).toString('utf-8')
      expect(s).toBe(text)
    })
  )
  expect.assertions(2)
})

// it('取得 存在しない', async () => {
//   await expect(events.get('nothing')).rejects.toBeUndefined()
// })

// it('追加', async () => {
//   await expect(events.add({})).resolves.toMatch(/^[\w-]+$/)
// })

// it('取得', async () => {
//   const id = await events.add({})
//   const event = await events.get(id)
//   expect(event).toHaveProperty('id', id)
//   expect(event).toHaveProperty('type', 'created')
//   expect(event).toHaveProperty('date', expect.any(Date))
// })

// it('追加時にイベントが発火されること', async () => {
//   const resolver = new Promise((r) => events.on('event', r))
//   const id = await events.add({})
//   const event = await resolver
//   expect(event).toHaveProperty('id', id)
//   expect(event).toHaveProperty('type', 'created')
//   expect(event).toHaveProperty('date', expect.any(Date))
// })

// it('フィルタ 全件取得', async () => {
//   const e = await events.filter(() => true)
//   expect(e).toBeInstanceOf(Array)
//   expect(e.length).toBeGreaterThanOrEqual(2)
// })

// it('フィルタ', async () => {
//   const title = new Date().toISOString()
//   await events.add({ title })
//   await events.add({})
//   const e = await events.filter((event) => event.title === title)
//   expect(e).toBeInstanceOf(Array)
//   expect(e.length).toBe(1)
// })
