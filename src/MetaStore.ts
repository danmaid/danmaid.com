import { EventEmitter } from 'node:events'

export class MetaStore<T extends Record<string, unknown>> extends EventEmitter {
  add(meta: T) {}
}
