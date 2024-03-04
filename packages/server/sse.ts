interface RequestEvent extends Event {
  readonly request: Request
  respondWith(response: Response | Promise<Response>): void
}

export function filter(ev: Event): boolean {
  if (ev.type !== 'request') return false
  if (!('request' in ev) || !(ev.request instanceof Request)) return false
  if (ev.request.method !== 'GET') return false
  if (ev.request.headers.get('accept') !== 'text/event-stream') false
  return true
}

export function listener(ev: RequestEvent): void {
  const stream = new SSEStream()
  clients.add(stream)
  ev.respondWith(new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
    },
  }))
  console.log('SSE conntected.')
}

const clients = new Set<SSEStream>()

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
    if (type !== "message") message += `event: ${type}\n`;
    message += `data: ${data}\n`;
    if (lastEventId) message += `id: ${lastEventId}\n`;
    message += "\n";
    this.enqueue(message);
  }
}
