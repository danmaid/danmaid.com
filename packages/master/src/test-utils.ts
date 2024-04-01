import { afterAll, jest } from '@jest/globals'
import { Readable } from 'node:stream'
import { Request, Response, Slave, RequestEvent } from './Slave'

jest.mock('node:http2', () => {
  const actual = jest.requireActual<typeof import('node:http2')>('node:http2')
  const sessions = new Set<{ close(cb: () => void): void }>()
  const connect = actual.connect
  jest.spyOn(actual, 'connect').mockImplementation((...args) => {
    const session = connect(...args)
    sessions.add(session)
    return session
  })
  afterAll(async () => {
    await new Promise<void>(r => setTimeout(r, 1000))
    for (const s of sessions) await new Promise<void>(r => s.close(r))
  })
  return actual
})

jest.mock('@danmaid/master', () => {
  const actual = jest.requireActual<typeof import('@danmaid/master')>('@danmaid/master')
  return {
    ...actual,
    Slave: class extends EventTarget {
      addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions | undefined): void {
        slave.addEventListener(type, callback, options)
      }
    }
  }
})
const slave = new EventTarget()

interface RequestInit {
  method?: string
  body?: Readable
  headers?: HeadersInit
}
export async function fetch(input: string, init?: RequestInit): Promise<Response> {
  const ev = RequestEvent.from(init?.method || 'GET', input, new Headers(init?.headers), init?.body || Readable.from([]))
  slave.dispatchEvent(ev)
  if (!ev.response) throw Error('no response')
  return ev.response
}
