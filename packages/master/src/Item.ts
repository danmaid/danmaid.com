import { connect } from 'node:http2'

type Proxy<T = Record<string, unknown>> = Readonly<T> & {
  indeterminate?: true
  set(value: T): void
} & EventTarget

export function getItem(path: string): Proxy
export function getItem<T extends object>(path: string, init?: T): Proxy<T>
export function getItem<T extends object>(path: string, init?: T) {
  const item = new Item(path, init)
  return new Proxy({}, {
    get(target, p, receiver) {
      if (item.value && p in item.value) return Reflect.get(item.value, p)
      if (p === 'indeterminate') return item.indeterminate
      if (p === 'set') return (value: T) => item.value = value
      if (p === 'addEventListener') return item.addEventListener.bind(item)
      if (p === 'removeEventListener') return item.removeEventListener.bind(item)
      if (p === 'dispatchEvent') return item.dispatchEvent.bind(item)
      return Reflect.get(target, p, receiver)
    },
    ownKeys(target) {
      const keys = new Set<string | symbol>()
      if (item.value) for (const k in item.value) keys.add(k)
      if (item.indeterminate) keys.add('indeterminate')
      return [...keys]
    },
    getOwnPropertyDescriptor(target, p) {
      if (p = 'indeterminate') return Reflect.getOwnPropertyDescriptor(item, p)
      if (item.value) return Reflect.getOwnPropertyDescriptor(item.value, p)
    },
  })
}
class ErrorEvent extends Event {
  error: any
  constructor(type: string, { error, ...eventInit }: { error?: any } & EventInit) {
    super(type, eventInit)
    this.error = error
  }
}

interface ItemEventMap {
  change: Event
}
interface Item {
  addEventListener<K extends keyof ItemEventMap>(type: K, listener: (this: Item, ev: ItemEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void
  removeEventListener<K extends keyof ItemEventMap>(type: K, listener: (this: Item, ev: ItemEventMap[K]) => any, options?: boolean | EventListenerOptions): void
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

class Item<T = unknown> extends EventTarget {
  value?: T
  indeterminate = true
  constructor(path: string, init?: T) {
    super()
    this.value = init
    const url = new URL(path, 'https://danmaid.com')
    const session = connect(url)
    const stream = session.request({ ':path': url.pathname })
    stream.setEncoding('utf-8')
    let data = ''
    stream.on('data', (chunk) => data += chunk)
    stream.on('end', () => {
      try {
        this.value = JSON.parse(data)
        this.indeterminate = false
        this.dispatchEvent(new Event('change'))
      } catch (error) {
        this.dispatchEvent(new ErrorEvent('error', { error }))
      }
    })
    stream.end()
  }
}
