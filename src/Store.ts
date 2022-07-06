export class Store<K, V> {
  items = new Map<K, V>();
  [Symbol.iterator] = () => this.items.entries()

  async get(key: K): Promise<V> {
    const v = this.items.get(key)
    if (!v) throw Error('Not Found.')
    return v
  }

  async set(key: K, value: V): Promise<void> {
    this.items.set(key, value)
  }
}
