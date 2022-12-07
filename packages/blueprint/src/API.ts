export class API<T = unknown> {
  path
  events?: EventSource

  constructor(path: string) {
    this.path = path
  }

  async list(): Promise<T[]> {
    const res = await fetch(this.path, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw res
    return await res.json()
  }

  async create(v: T): Promise<string> {
    const res = await fetch(this.path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(v),
    })
    if (!res.ok) throw res
    return await res.json()
  }

  async update(id: string, v: T): Promise<void> {
    const res = await fetch(`${this.path}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v),
    })
    if (!res.ok) throw res
  }

  async delete(id: string): Promise<void> {
    const res = await fetch(`${this.path}/${id}`, { method: 'DELETE' })
    if (!res.ok) throw res
  }

  connect(): EventSource {
    const events = new EventSource(this.path)
    window.addEventListener('unload', () => events.close())
    this.events = events
    return events
  }

  disconnect(): void {
    this.events?.close()
  }
}
