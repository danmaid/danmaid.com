const kWaitUntil = Symbol('waitUntil')
export class StoreEvent extends Event implements globalThis.StoreEvent {
  path: string;
  data: ReadableStream;
  constructor(type: string, eventInitDict: { path: string, data: ReadableStream } & EventInit) {
    super(type, eventInitDict)
    this.path = eventInitDict.path
    this.data = eventInitDict.data
  }

  [kWaitUntil]: Promise<unknown>[] = []
  waitUntil(promise: Promise<unknown>): void {
    this[kWaitUntil].push(promise)
  }
}

export async function dispatch(request: Request): Promise<Response> {
  const { method, url, body } = request
  if (method === 'PUT') {
    const path = decodeURIComponent(new URL(url).pathname)
    if (body) {
      const e = new StoreEvent('store', { path, data: body })
      dispatchEvent(e)
      await Promise.all(e[kWaitUntil])
      const reader = body.getReader()
      const { done } = await reader.read()
      reader.releaseLock()
      if (!done) return new Response(null, { status: 500 })
    }
    return new Response(null, { status: 200 })
  }
  return new Response(null, { status: 501 })
}

declare global {
  interface WindowEventMap {
    store: StoreEvent
  }
  interface StoreEvent extends Event {
    path: string
    data: ReadableStream
    waitUntil(promise: Promise<unknown>): void
  }
}
