export abstract class Peer<K, V> extends EventTarget {
  update(key: K, value: V) {
    this.dispatchEvent(new UpdatedEvent('updated', { key, value }))
  }
  remove(key: K) {
    this.dispatchEvent(new RemovedEvent('removed', { key }))
  }
  load(items: [K, V][] = []) {
    this.dispatchEvent(new LoadedEvent('loaded', { items }))
  }
}

export interface Peer<K, V> extends EventTarget {
  addEventListener<E extends keyof PeerEventMap<K, V>>(type: E, listener: (ev: PeerEventMap<K, V>[E]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

interface PeerEventMap<K, V> {
  updated: UpdatedEvent<K, V>
  removed: RemovedEvent<K>
  loaded: LoadedEvent<K, V>
}

class UpdatedEvent<K, V> extends Event {
  readonly key: K
  readonly value: V
  constructor(type: string, { key, value, ...init }: { key: K, value: V } & EventInit) {
    super(type, init)
    this.key = key
    this.value = value
  }
}
class RemovedEvent<K> extends Event {
  readonly key: K
  constructor(type: string, { key, ...init }: { key: K } & EventInit) {
    super(type, init)
    this.key = key
  }
}
class LoadedEvent<K, V> extends Event {
  readonly items: [K, V][]
  constructor(type: string, { items, ...init }: { items: [K, V][] } & EventInit) {
    super(type, init)
    this.items = items
  }
}
