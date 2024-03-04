import { dirname } from "https://deno.land/std@0.212.0/path/dirname.ts";
import { SSEStream } from "./SSEStream.ts";
import { join } from "https://deno.land/std@0.212.0/path/join.ts";

class RequestInfo {
  constructor(public request: Request, public info: Deno.ServeHandlerInfo) { }
  readonly id = crypto.randomUUID();
  readonly timestamp = new Date();
  get method() { return this.request.method; }
  get url() { return this.request.url; }
  get headers() { return this.request.headers; }
  get remote() { return this.info.remoteAddr; }
}
class ResponseInfo {
  constructor(public response: Response, public request: RequestInfo) { }
  readonly timestamp = new Date();
  get status() { return this.response.status; }
  get headers() { return this.response.headers; }
}


Deno.serve(
  {
    port: 443,
    cert: Deno.readTextFileSync(Deno.env.get("CERT_FILE") || "localhost.crt"),
    key: Deno.readTextFileSync(Deno.env.get("KEY_FILE") || "localhost.key"),
  },
  async (req, info) => {
    const requestInfo = new RequestInfo(req, info);
    accessLog(requestInfo);
    broadcast(requestInfo);
    const res: Response = await handler(req);
    const responseInfo = new ResponseInfo(res, requestInfo);
    accessLog(responseInfo);
    broadcast(responseInfo);
    return res;
  }
)

function accessLog(info: RequestInfo | ResponseInfo) {
  const columns: unknown[] = [info.timestamp];
  info instanceof RequestInfo
    ? columns.push("request", info.id, ":=", info.method, info.url, info.remote)
    : columns.push("response", info.request.id, "=>", info.status);
  console.info(...columns);
  console.debug(Object.fromEntries(info.headers));
}

const clients = new Set<SSEStream>();
function connect(): Response {
  const stream = new SSEStream();
  clients.add(stream);
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store", },
  });
}
function broadcast(info: RequestInfo | ResponseInfo) {
  const { timestamp } = info;
  const data: Record<string, unknown> = { timestamp };
  if (info instanceof RequestInfo) {
    data.id = info.id;
    data.remote = info.remote;
    data.method = info.method;
    data.url = info.url;
  } else {
    data.request = info.request.id;
    data.status = info.status;
  }
  data.headers = Object.fromEntries(info.headers);
  for (const client of clients) try {
    client.send(JSON.stringify(data), "response");
  } catch {
    clients.delete(client);
  }
}

async function handler(req: Request): Promise<Response> {
  const { method, headers, body, url } = req
  try {
    if (method === 'GET') {
      const path = join('./data', decodeURIComponent(new URL(url).pathname));
      const accept = req.headers.get("accept");
      // Connect SSE
      if (accept === "text/event-stream") return connect();
      // Content-Type Negotiation
      const exts = ['']
      if (accept) {
        exts.splice(0)
        const types = accept.split(",")
          .map((v) => {
            const [type, q] = v.split(";q=");
            const quality = q ? parseFloat(q) || 1 : 1;
            return { type, quality };
          })
          .sort((a, b) => b.quality - a.quality)
        for (const x of types) {
          const type = x.type.trim()
          if (type === '*/*') {
            exts.push('')
            continue
          }
          if (type.endsWith('/*')) {
            exts.push('.' + type.replace('/*', ''))
            continue
          }
          exts.push('.' + type.replace('/', '.'))
        }
      }
      for (const ext of exts) {
        try {
          return await get(`${path}${ext}`)
        } catch (err) {
          console.debug(`${path}${ext}`, 'ignore', err)
          continue
        }
      }
      return new Response(null, { status: 404 })
    }
    if (method === 'PUT') {
      const path = join('./data', decodeURIComponent(new URL(url).pathname));
      if (!body) return new Response(null, { status: 400 })
      await Deno.mkdir(dirname(path), { recursive: true })
      const contentType = headers.get('content-type')
      const options = { write: true, truncate: true, create: true }
      if (contentType) {
        const ext = contentType.split(';', 1)[0].replace('/', '.')
        const datafile = await Deno.open(`${path}.${ext}`, options)
        await body.pipeTo(datafile.writable)
        // save content-type
        try {
          const metafile = await Deno.open(`${path}.${ext}.application.json`, { read: true, write: true })
          const meta = await new Response(metafile.readable).json()
          const key = Object.keys(meta).find(v => v.toLowerCase() === 'content-type')
          key ? meta[key] = contentType : meta['content-type'] = contentType
          await metafile.truncate()
          await metafile.write(new TextEncoder().encode(JSON.stringify(meta)))
          metafile.close()
        } catch {
          const data = JSON.stringify({ 'content-type': contentType })
          await Deno.writeTextFile(`${path}.${ext}.application.json`, data, { create: true })
        }
        // save content-location if not exists
        try {
          const data = JSON.stringify({ 'content-location': `${url}.${ext}` })
          await Deno.writeTextFile(`${path}.application.json`, data, { createNew: true })
        } catch {
          //
        }
      } else {
        const file = await Deno.open(path, options)
        await body.pipeTo(file.writable)
      }
      return new Response()
    }
    return new Response(null, { status: 501 });
  } catch (err) {
    console.debug(err);
    return new Response(null, { status: 404 });
  }
}

async function get(path: string): Promise<Response> {
  const headers = new Headers()
  try {
    const data = await Deno.readTextFile(`${path}.application.json`)
    const h = new Headers(JSON.parse(data))
    const l = h.get('content-location')
    if (l) return get(decodeURIComponent(new URL(l).pathname))
    const type = h.get('content-type')
    if (type) headers.set('content-type', type)
  } catch {
    //
  }
  const file = await Deno.open(path, { read: true })
  return new Response(file.readable, { headers })

}