import { connect, broadcast } from "./sse.ts";
import { negotiation, getHeaders, saveByType } from './content.ts'
import { load, save, remove } from "./file.ts";

const cert = Deno.readTextFileSync(Deno.env.get("CERT_FILE") || "../localhost.crt")
const key = Deno.readTextFileSync(Deno.env.get("KEY_FILE") || "../localhost.key")

Deno.serve(
  { port: 443, cert, key, },
  async (req, info) => {
    const id = crypto.randomUUID()
    console.log(id, info.remoteAddr)
    console.log(id, ':=', req.method, req.url)
    const res = await handle(req, info.remoteAddr);
    if (res.ok) {
      if (req.method === 'PUT' || req.method === 'PATCH') {
        broadcast(new URL(req.url).pathname, 'change')
      } else if (req.method === 'DELETE') {
        broadcast(new URL(req.url).pathname, 'remove')
      }
    }
    console.log(id, '=>', res.status, res.ok)
    return res;
  }
)

async function handle(req: Request, info?: unknown): Promise<Response> {
  const { method, headers, url, body } = req
  const path = decodeURIComponent(new URL(url).pathname);
  if (method === 'GET') {
    if (headers.get('accept') === 'text/event-stream') return connect(req, info)
    const accept = headers.get("accept");
    if (accept) return await negotiation(path, accept)
    try {
      const headers = await getHeaders(path)
      const body = await load(headers.get('content-location') || path)
      return new Response(body, { headers })
    } catch (err) {
      console.log(err)
      return new Response(null, { status: 404 })
    }
  }
  if (method === 'PUT') {
    if (!body) return new Response(null, { status: 400 })
    const type = headers.get('content-type')
    if (type) return saveByType(path, type, body)
    await save(path, body)
    return new Response()
  }
  if (method === 'DELETE') {
    await remove(path).catch(() => null)
    const headers = new Headers()
    try {
      const location = (await getHeaders(path)).get('content-location')
      if (location) {
        await remove(location)
        await remove(location + '.application.json').catch(() => null)
        headers.set('conetnt-location', location)
      }
    } catch {
      //
    }
    await remove(path + '.application.json').catch(() => null)
    return new Response(null, { headers })
  }
  if (method === 'PATCH') {
    if (!body) return new Response(null, { status: 400 })
    const type = headers.get('content-type')
    if (type === 'application/json') {
      const x = await load(path + '.application.json')
      const old = await new Response(x).json()
      const patch = await req.json()
      const patched = new Blob([JSON.stringify({ ...old, ...patch })]).stream()
      await save(path + '.application.json', patched)
      return new Response()
    }
  }
  return new Response(null, { status: 501 })
}
