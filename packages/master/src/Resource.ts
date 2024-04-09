import { EventEmitter } from 'node:events'
import { connect, ClientHttp2Session } from 'node:http2'

export const value = Symbol('Resource.value')

interface Common<T> {
  indeterminate?: true
  on: EventEmitter['on']
  off: EventEmitter['off']
  once: EventEmitter['once']
  emit: EventEmitter['emit']
  close(): Promise<void>
  [value]: T | null
}

export function getResource<T extends object = {}>(path: string, init?: T): Common<T> & T {
  const resource = new Resource<T>(path, init)
  return new Proxy({}, {
    get(target, p, receiver) {
      if (resource[value] && p in resource[value]) return Reflect.get(resource[value], p)
      return Reflect.get(resource, p, receiver)
    },
    ownKeys(target) {
      const keys = new Set<string | symbol>()
      for (const k in resource[value]) keys.add(k)
      if (resource.indeterminate) keys.add('indeterminate')
      return [...keys]
    },
    getOwnPropertyDescriptor(target, p) {
      if (p = 'indeterminate') return Reflect.getOwnPropertyDescriptor(resource, p)
      if (resource[value]) return Reflect.getOwnPropertyDescriptor(resource[value], p)
    },
  }) as Common<T> & T
}

class Resource<T> extends EventEmitter<{ change: [] }> {
  indeterminate? = true
  #session: ClientHttp2Session
  [value]: T | null

  constructor(path: string, init?: T) {
    super()
    this[value] = init || null
    const url = new URL(path, 'https://danmaid.com')
    const session = connect(url)
    const stream = session.request({ ':path': url.pathname })
    stream.on('response', (headers) => {
      const chunks: Buffer[] = []
      stream.on('data', (chunk) => chunks.push(chunk))
      stream.on('end', () => {
        const body = Buffer.concat(chunks).toString()
        this[value] = JSON.parse(body)
        this.indeterminate = undefined
        this.emit('change')
      })
    })
    stream.end()
    this.#session = session
  }

  close(): Promise<void> {
    return new Promise<void>(r => this.#session.close(r))
  }
}