export function cors(req: Request, allow: { origins: string[], methods: string[], headers: string[] }): Headers {
  const res = new Headers({ vary: 'origin' })
  const origin = req.headers.get('origin')
  if (!origin) return res
  if (allow.origins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin)
  }
  // preflight
  if (req.method === 'OPTIONS') {
    const method = req.headers.get('Access-Control-Request-Method')
    if (method && allow.methods.includes(method)) {
      res.set('Access-Control-Allow-Methods', method)
    }
    const headers = req.headers.get('Access-Control-Request-Headers')
    if (headers) {
      for (const header of headers.split(',').map((v) => v.trim())) {
        if (allow.headers.includes(header)) {
          res.append('Access-Control-Allow-Headers', header)
        }
      }
    }
  }
  return res
}
