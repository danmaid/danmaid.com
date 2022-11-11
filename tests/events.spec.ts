import fetch from 'node-fetch'
import { Server } from '../src'
import { getUrl, startServer } from './utils'
import EventSource from 'eventsource'

const server = new Server()
startServer(server)

let url: string
beforeAll(async () => (url = getUrl(server.address())))

describe.only('', () => {
  const events: MessageEvent[] = []
  let src: EventSource

  beforeAll(async () => {
    src = new EventSource(url)
    src.onmessage = ({ data }) => events.push(JSON.parse(data))
    await new Promise((r) => (src.onopen = r))
  })
  afterAll(async () => {
    src.close()
  })

  it('', async () => {
    const body = JSON.stringify({ title: 'test' })
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    const id = res.headers.get('Event-ID')
    expect(id).toMatch(/^[\w-]+$/)
    const date = res.headers.get('Event-Date')
    expect(new Date('invalid').getTime()).toBeFalsy()
    expect(new Date(date || 'invalid').getTime()).toBeTruthy()
    const event = expect.objectContaining({
      path: '/',
      'content-type': 'application/json',
      'content-length': `${body.length}`,
    })
    expect(events).toContainEqual({ id, date, event, content: true })
  })
})

describe('保持しているイベントが大量でも問題なく動作できること', () => {
  it('大量イベント準備', async () => {
    const concurrent = 10
    const count = 10000
    const event = { type: 'sensed', temperature: 25.6, humidity: 41.46, magnet: 'open' }
    const post = () =>
      fetch(url + `/sensors/test/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      })
    for (let i = 0; i < count / concurrent; i++) {
      const reses = await Promise.all(new Array(concurrent).fill(0).map(post))
      expect(reses.length).toBe(concurrent)
      expect(reses.every((res) => res.status === 201)).toBe(true)
    }
    expect.assertions((count / concurrent) * 2)
  }, 10000)

  let id: string | undefined
  it('POST /todos/:id && DELETE /todos/:id', async () => {
    const res = await fetch(url + '/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'test' }),
    })
    id = await res.json()
    await fetch(url + `/todos/${id}`, { method: 'DELETE' })
  })

  it('GET /todos/:id/events', async () => {
    const res = await fetch(url + `/todos/${id}/events`, { headers: { accept: 'application/json' } })
    expect(res.status).toBe(200)
    expect(res.ok).toBe(true)
    const data: Record<string, unknown>[] = await res.json()
    expect(data).toBeInstanceOf(Array)
    expect(data.length).toBe(2)
  })
})
