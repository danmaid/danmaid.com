export class DefaultMap<K, V> extends Map<K, V> {
  constructor(public factory: () => V) {
    super()
  }
  get(key: any) {
    const value = super.get(key)
    if (value) return value
    const v = this.factory()
    this.set(key, v)
    return v
  }
}
