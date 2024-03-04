const allowOrigins = [
  'https://danmaid.com',
  'chrome-extension://hmnkpdkofkhlnfdefjamlhhmgcfeoppc'
]
const allowMethods = ['PUT', 'DELETE']
const allowHeaders = ['Content-Type']

interface RequestEvent extends Event {
  readonly request: Request
  respondWith(response: Response | Promise<Response>): void
}

interface ResponseEvent extends Event {
  readonly response: Response
  readonly request: Request
}

export function filter(ev: Event): boolean {
  if (!(ev.type === 'response' || ev.type === 'request')) return false
  if (!('request' in ev) || !(ev.request instanceof Request)) return false
  return true
}

export function listener(ev: RequestEvent | ResponseEvent): void {
  const origin = ev.request.headers.get('origin')
  if (!origin || !allowOrigins.includes(origin)) {
    ev.stopImmediatePropagation()
    if ('respondWith' in ev) {
      ev.respondWith(new Response(null, { status: 401 }))
      return
    }
    return
  }
  if (!('response' in ev)) return
  ev.response.headers.set("Access-Control-Allow-Origin", origin)
  if (ev.request.method === 'OPTIONS') {

  }
  console.log('set CORS', origin)
}

function cors(req: Request, allow: { origins: string[], methods: string[], headers: string[] }): Headers {
  const res = new Headers({ vary: 'origin' })
  const origin = req.headers.get('origin')
  if (!origin) return res
  if (allow.origins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin)
  }
  // preflight
  if (req.method === 'OPTIONS') {
    const method = req.headers.get('Access-Control-Request-Method')
    if (method && allow.origins.includes(method)) {
      res.set('Access-Control-Allow-Methods', method)
    }
    const headers = req.headers.get('Access-Control-Request-Headers')
    if (headers) {
      for (const header of headers.split(',').map((v) => v.trim())) {
        if (allow.headers.includes(header)) {
          res.set('Access-Control-Allow-Headers', header)
        }
      }
    }
  }
  return res
}
