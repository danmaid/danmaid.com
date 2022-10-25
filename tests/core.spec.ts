import EventSource from 'eventsource'
import fetch from 'node-fetch'

const url: string = (globalThis as any).__URL__

export function connectSSE(): EventSource {
  const sse = new EventSource(url)

  it('readyState が OPEN であること', async () => {
    if (sse.readyState === EventSource.CONNECTING) {
      await expect(new Promise((r) => (sse.onopen = r))).resolves.toBeTruthy()
    }
    expect(sse.readyState).toBe(EventSource.OPEN)
  })

  afterAll(async () => {
    sse.close()
  })
  return sse
}

const sse = connectSSE()

it('Request を EventSource に配信すること', async () => {
  const events: any = []
  sse.onmessage = (ev) => events.push(JSON.parse(ev.data))
  await fetch(url)
  expect(events).toContainEqual(
    expect.objectContaining({
      type: 'request',
      id: expect.stringMatching(/^[\w-]+$/),
      url: '/',
      method: 'GET',
    })
  )
})
