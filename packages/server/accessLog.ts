export function filter(ev: Event): boolean {
  return ev.type === 'request' || ev.type === 'response'
}

export function listener(ev: Event): void {
  const columns = [new Date().toISOString()]
  if ('request' in ev) {
    if (ev.request && typeof ev.request === 'object')
      if ('accessLog' in ev.request) {
        columns.push(String(ev.request.accessLog))
      } else if ('method' in ev.request && 'url' in ev.request) {
        const id = crypto.randomUUID()
        const method = ev.request.method
        const url = ev.request.url
        Object.defineProperty(ev.request, 'accessLog', { value: `[${id}]` })
        columns.push(`[${id}] ${method} ${url}`)
      }
  }
  if ('response' in ev && ev.response && typeof ev.response === 'object') {
    if ('status' in ev.response) {
      const status = ev.response.status
      columns.push('=>', String(status))
    }
  }
  if (columns.length > 1) console.log(...columns)
}
