export type FilterMode = 'partial' | 'exact' | 'forward' | 'backward'
export interface CommonQueryParams<T> {
  limit?: number
  offset?: number
  fields?: string[]
  filter?: FilterMode
  sort?: (keyof T)[]
}
export type QueryParams<T = Record<string, unknown>> = CommonQueryParams<T> & Partial<T>

export function limitOffset<T>(array: T[], limit = 100, offset = 0): T[] {
  return array.slice(offset, limit + offset)
}

export function pickFields<T extends Record<string, unknown>>(value: T, fields: (keyof T)[]): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([k]) => fields.includes(k))) as Partial<T>
}

export function getStringFilter(mode: FilterMode = 'partial'): (value: string, expected: string) => boolean {
  if (mode === 'partial') return (v, e) => !!v.match(e)
  if (mode === 'exact') return (v, e) => v === e
  if (mode === 'forward') return (v, e) => v.startsWith(e)
  if (mode === 'backward') return (v, e) => v.endsWith(e)
  throw Error(`Unsupport filter mode. ${mode}`)
}

export function kvFilter<T extends Record<string, unknown>>(value: T, kv: Partial<T>, mode?: FilterMode): boolean {
  const stringFilter = getStringFilter(mode)
  for (const [k, e] of Object.entries(kv)) {
    const v = value[k]
    if (v == e) continue
    if (typeof v !== 'string') return false
    if (!stringFilter(v, e)) return false
  }
  return true
}

type compareFn<T> = Exclude<Parameters<Array<T>['sort']>[0], undefined>
export function orderByProps<T extends object>(props: (keyof T)[]): compareFn<T> {
  return function (a: T, b: T): number {
    for (const prop of props) {
      if (a[prop] > b[prop]) return 1
      if (a[prop] < b[prop]) return -1
    }
    return 0
  }
}

export class Query<T extends Record<string, unknown>> {
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

  get compareFn(): compareFn<T> {
    if (!this.sort) throw Error('sort undefined.')
    const props = this.sort
    return function (a: T, b: T): number {
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

  get kvf(): (v: T) => boolean {
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

  /** 元の配列を壊します。 */
  exec(array: T[]): T[] {
    const xx = this.kv ? array.filter(this.kvf) : array
    if (this.sort) xx.sort(this.compareFn)
    const x = xx.slice(this.offset, this.limit + this.offset)
    const z = fields ? y.map((v) => pickFields(v, fields)) : y
    return z
  }
}
