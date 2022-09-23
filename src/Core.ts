import { debuglog } from 'node:util'

const console = { debug: debuglog('core') }

export class Core<T = any> {
  listeners: { matcher: (...args: T[]) => boolean; listener: (...args: T[]) => void }[] = []

  emit(...args: T[]): void {
    console.debug('emit', ...args)
    this.listeners.filter(({ matcher }) => matcher(...args)).forEach(({ listener }) => listener(...args))
  }

  on(matcher: (...args: T[]) => boolean, listener: (...args: T[]) => void): void {
    this.listeners.push({ matcher, listener })
  }
}
