import { serve } from './http.ts'

serve({
  port: 443,
  cert: Deno.readTextFileSync('./localhost.crt'),
  key: Deno.readTextFileSync('./localhost.key')
})

const listeners = new class {
  #listeners: {
    filter?: (ev: Event) => boolean,
    listener: (ev: Event) => void
  }[] = []

  async add(module: string, index?: number) {
    const mod = await import(module)
    if (index === undefined) return this.#listeners.push(mod)
    this.#listeners.splice(index, 0, mod)
  }
  remove(index: number) {
    this.#listeners.splice(index, 1)
  }
  [Symbol.iterator]() { return this.#listeners }

  dispatchEvent(ev: Event): boolean {
    const x = this.#listeners.filter((v) => v.filter ? v.filter(ev) : true)
    let stop = false
    const _stopImmediatePropagation = ev.stopImmediatePropagation
    ev.stopImmediatePropagation = () => {
      stop = true
      _stopImmediatePropagation.bind(ev)()
    }
    for (const y of x) {
      if (stop) break
      y.listener(ev)
    }
    return stop
  }
}

await listeners.add('./accessLog.ts')
await listeners.add('./cors.ts')
await listeners.add('./store.ts')
await listeners.add('./debugLog.ts')
await listeners.add('./sse.ts')

// catch all event
const _dispatchEvent = globalThis.dispatchEvent
globalThis.dispatchEvent = (ev: Event) => {
  if (listeners.dispatchEvent(ev)) return ev.defaultPrevented
  return _dispatchEvent(ev)
}
