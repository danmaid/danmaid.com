import fetch from 'node-fetch'
import { Server } from '../src'
import { getUrl, startServer } from './utils'

const server = new Server()
startServer(server)

let url: string
beforeAll(async () => (url = getUrl(server.address())))

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
