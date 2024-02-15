const cert = Deno.readTextFileSync("localhost.crt")
const key = Deno.readTextFileSync("localhost.key")
const allowOrigin = "chrome-extension://hmnkpdkofkhlnfdefjamlhhmgcfeoppc"

const clients = new Set<SSEStream>()
const views = new Map()

Deno.serve({ port: 443, cert, key, }, async (req, info) => {
  console.log(req)
  if (req.method === 'PUT') {
    const id = decodeURIComponent(new URL(req.url).pathname).split('/').findLast(() => true)
    const data = await req.json()
    views.set(id, data)
    for (const client of clients) {
      try {
        client.send(JSON.stringify(data), 'change')
        console.log('sent', data)
      } catch (err) {
        console.error(err)
        clients.delete(client)
      }
    }
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
      }
    })
  }
  if (req.method === 'DELETE') {
    const id = decodeURIComponent(new URL(req.url).pathname).split('/').findLast(() => true)
    if (!id || !views.delete(id)) return new Response(null, { status: 404 })
    for (const client of clients) {
      try {
        client.send(id, 'remove')
        console.log('sent', 'remove', id)
      } catch (err) {
        console.error(err)
        clients.delete(client)
      }
    }
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
      }
    })
  }
  if (req.method === 'GET') {
    const accept = req.headers.get('accept')
    if (accept === 'text/event-stream') {
      const stream = new SSEStream()
      clients.add(stream)
      console.log('SSE conntected.')
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": allowOrigin
        },
      });
    }
    if (accept?.includes('text/html')) {
      const contents = await Deno.readTextFile('index.html')
      return new Response(contents, { headers: { 'content-type': 'text/html' } })
    }
    if (accept === 'application/json') {
      const body = JSON.stringify(Array.from(views.values()))
      return new Response(body)
    }
  }
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": 'PUT, DELETE',
        "Access-Control-Allow-Headers": "Content-Type"
      }
    })
  }
  if (req.method === 'PATCH') {
    const id = decodeURIComponent(new URL(req.url).pathname).split('/').findLast(() => true)
    const view = views.get(id)
    const data = await req.json()
    if (!view) return new Response(null, { status: 404 })
    const changed = Object.assign(view, data)
    for (const client of clients) {
      try {
        client.send(JSON.stringify(changed), 'change')
        console.log('sent', changed)
      } catch (err) {
        console.error(err)
        clients.delete(client)
      }
    }
    return new Response()
  }

  return new Response(null, { status: 501 })
})

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
