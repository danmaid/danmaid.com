export class LimitedArray<T> extends Array<T> {
  limit = 100

  constructor(options?: { limit?: 100 }) {
    super()
    if (options?.limit !== undefined) this.limit = options.limit
  }

  push(...items: T[]): number {
    const length = super.push(...items)
    // while (length > this.limit) super.shift()
    return super.length
  }
}
