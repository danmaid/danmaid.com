export type FilterMode = 'partial' | 'exact' | 'forward' | 'backward'
export interface CommonQueryParams<T> {
  limit?: number
  offset?: number
  fields?: string[]
  filter?: FilterMode
  sort?: (keyof T)[]
}
export type QueryParams<T = Record<string, unknown>> = CommonQueryParams<T> & Partial<T>

export class QueryFilter<T extends Record<string, unknown>> {
  limit = 100
  offset = 0
  fields?: string[]
  filter: FilterMode = 'partial'
  sort?: (keyof T)[]
  kv?: Omit<Partial<T>, 'limit' | 'offset' | 'fields' | 'filter' | 'sort'>

  constructor(params: QueryParams<T>) {
    const { limit, offset, fields, filter, sort, ...kv } = params
    if (limit) this.limit = limit
    if (offset) this.offset = offset
    if (fields) this.fields = fields
    if (filter) this.filter = filter
    if (sort) this.sort = sort
    if (Object.keys(kv).length > 0) this.kv = kv
  }

  get compareFn(): Exclude<Parameters<Array<T>['sort']>[0], undefined> {
    if (!this.sort) throw Error('sort undefined.')
    const props = this.sort
    return (a: T, b: T): number => {
      for (const prop of props) {
        if (a[prop] > b[prop]) return 1
        if (a[prop] < b[prop]) return -1
      }
      return 0
    }
  }

  get stringFilter(): (value: string, expected: string) => boolean {
    if (this.filter === 'partial') return (v, e) => !!v.match(e)
    if (this.filter === 'exact') return (v, e) => v === e
    if (this.filter === 'forward') return (v, e) => v.startsWith(e)
    if (this.filter === 'backward') return (v, e) => v.endsWith(e)
    throw Error(`Unsupport filter mode. ${this.filter}`)
  }

  get kvFilter(): (v: T) => boolean {
    if (!this.kv) throw Error('kv for filter not found.')
    const kv = this.kv
    return (value) => {
      for (const [k, e] of Object.entries(kv)) {
        const v = value[k]
        if (v == e) continue
        if (typeof v !== 'string') return false
        if (!this.stringFilter(v, e)) return false
      }
      return true
    }
  }

  get pickFields(): (v: T) => Partial<T> {
    if (!this.fields) throw Error('fields not found.')
    const fields = this.fields
    return (v) => Object.fromEntries(Object.entries(v).filter(([k]) => fields.includes(k))) as Partial<T>
  }

  /** 元の配列を壊します。 */
  exec(array: T[]): Partial<T>[] {
    const x = this.kv ? array.filter(this.kvFilter) : array
    if (this.sort) x.sort(this.compareFn)
    const y = x.slice(this.offset, this.limit + this.offset)
    return this.fields ? y.map(this.pickFields) : y
  }
}
