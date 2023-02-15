export interface EventStore<T = Record<string, unknown>> {
  add(event: T): Promise<string>
  filter<S extends T>(fn: (event: T) => event is S): Promise<S[]>
  filter(fn: (event: T) => boolean): Promise<T[]>
}
