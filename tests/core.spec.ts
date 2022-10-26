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

// core
it.todo('イベントを受信する')
it.todo('受信したイベントを配信する')

// archiver
it.todo('イベントを保存する')
it.todo('保存したイベントを取得する')
it.todo('保存したイベントの一覧を取得する')

it.todo('コンテンツを保存する')
it.todo('コンテンツを取得する')
it.todo('コンテンツの一覧を取得する')

// Core := EventEmitter
// REST := HTTP Server
// EventStore :=  Database or FileSystem
// ContentStore := Database or FileSystem
