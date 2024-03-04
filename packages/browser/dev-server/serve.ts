function sequential<T extends (...args: any[]) => any>(fn: T): (...args: Parameters<T>) => Promise<void> {
  let prev = Promise.resolve()
  return (...args) => prev = prev.finally(() => fn(...args))
}

const cert = Deno.readTextFileSync("localhost.crt")
const key = Deno.readTextFileSync("localhost.key")

const locations = new Map<string, string>()
const links = new Map<string, Set<string>>()
const store = new Map<string, object>()

let stop = 100

let seq: Promise<Response | void> = Promise.resolve()
Deno.serve({ port: 443, cert, key, }, async (req, info) => {
  if (stop-- < 0) return new Response(null, { status: 500 })
  console.log(stop)
  await Promise.allSettled([seq])
  return seq = handler(req, info)
})

async function handler(req: Request, info: Deno.ServeHandlerInfo) {
  console.log(req.method, req.url, info.remoteAddr.port)
  const path = decodeURIComponent(new URL(req.url).pathname)
  if (req.method === 'PUT') {
    const location = req.headers.get('location')
    if (location) {
      console.log('location header found.', location)
      locations.set(path, location)
      const t = links.get(location) || new Set()
      t.add(path)
      links.set(location, t)
      console.log('link set.', path, location, t)
      return new Response()
    }
    const data = await req.json()
    store.set(locations.get(path) || path, data)
    await sse.broadcast(locations.get(path) || path)
    return new Response()
  }
  if (req.method === 'DELETE') {
    const location = locations.get(path)
    if (location) locations.delete(path)
    const p = location || path
    if (store.delete(p)) {
      const link = links.get(p)
      if (link) {
        links.delete(p)
        for (const p of link) await sse.broadcast(p)
      }
      await sse.broadcast(p)
      return new Response()
    }
    return new Response(null, { status: 404 })
  }
  if (req.method === 'GET') {
    const accept = req.headers.get('accept')
    if (accept === 'text/event-stream') return sse.connect()
    if (accept?.includes('text/html')) {
      const contents = await Deno.readTextFile('../index.html')
      return new Response(contents, { headers: { 'content-type': 'text/html; charset=UTF-8' } })
    }
    if (accept === 'application/json') {
      const headers = new Headers({ 'content-type': 'application/json' })
      if (path.endsWith('/')) {
        const body = [...store]
          .filter(([k]) => k.startsWith(path))
          .map(([k, v]) => {
            const link = links.get(k)
            return {
              ...v,
              id: k.slice(path.length),
              links: link ? [...link] : undefined
            }
          })
        return new Response(JSON.stringify(body), { headers })
      }
      const location = locations.get(path)
      if (location) return new Response(null, { status: 301, headers: { location } })
      const body = store.get(path)
      const link = links.get(path)
      return body
        ? new Response(JSON.stringify({ ...body, links: link ? [...link] : undefined }), { headers })
        : new Response(null, { status: 404 })
    }
  }

  return new Response(null, { status: 501 })
}

const sse = new class extends Set<SSEStream> {
  headers = { "Content-Type": "text/event-stream", "Cache-Control": "no-store" }
  connect() {
    const stream = new SSEStream()
    this.add(stream)
    return new Response(stream, { headers: this.headers });
  }
  private queue = Promise.resolve()
  broadcast(data: string, type?: string) {
    return this.queue = this.queue.then(() => this._broadcast(data, type))
  }
  private _broadcast(data: string, type?: string) {
    for (const stream of this) {
      try {
        stream.send(data, type)
      } catch {
        this.delete(stream)
      }
    }
  }
}

class SSEStream extends ReadableStream<Uint8Array> {
  controller?: ReadableStreamDefaultController<Uint8Array>;
  encoder = new TextEncoder();
  constructor() {
    let ctrl;
    super({
      start: (controller) => {
        ctrl = controller;
      },
    });
    this.controller = ctrl;
    this.enqueue("retry: 5000\n\n");
  }

  enqueue(string: string): void {
    this.controller?.enqueue(this.encoder.encode(string));
  }

  send(data: string, type?: string, lastEventId?: string): void {
    let message = "";
    if (type) message += `event: ${type}\n`;
    message += `data: ${data}\n`;
    if (lastEventId) message += `id: ${lastEventId}\n`;
    message += "\n";
    console.log(message)
    this.enqueue(message);
  }
}
