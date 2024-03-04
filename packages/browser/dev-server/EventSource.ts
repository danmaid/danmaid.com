// Deno's EventSource is buggy @1.40.4
export class EventSource extends EventTarget {
  readyState = 0
  OPEN = 1
  stream?: ReadableStream<Uint8Array> | null
  reader?: ReadableStreamDefaultReader<Uint8Array>


  constructor(url: string) {
    super()
    this.connect(url)
  }

  async connect(url: string) {
    const res = await fetch(url, { headers: { accept: 'text/event-stream' } })
    if (!res.ok || !res.body) throw Error()
    this.readyState = this.OPEN
    this.dispatchEvent(new Event('open'))
    const stream = res.body
    const reader = stream.getReader()
    this.stream = stream
    this.reader = reader
    let text = ''
    const decoder = new TextDecoder()
    for (let x = await reader.read(); !x.done; x = await reader.read()) {
      const { value } = x
      text += decoder.decode(value)
      const lines = text.split('\n')
      text = lines.pop() || ''
      let data = ''
      let id = undefined
      let event = undefined
      for (const line of lines) {
        if (!line) {
          if (data) this.dispatchEvent(new MessageEvent(event || 'message', {
            lastEventId: id,
            data: data.slice(0, -1)
          }))
          data = ''
          id = undefined
          event = undefined
          continue
        }
        if (line.startsWith('data: ')) data += line.slice(6) + '\n'
        if (line.startsWith('event: ')) event = line.slice(7)
        if (line.startsWith('id: ')) id = line.slice(4)
      }
    }
  }

  close() {
    this.reader?.cancel()
    this.reader?.releaseLock()
    this.stream?.cancel()
  }
}

export interface EventSource {
  addEventListener(type: string, listener: (ev: MessageEvent) => void, options?: boolean | AddEventListenerOptions | undefined): void
  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions | undefined): void
}