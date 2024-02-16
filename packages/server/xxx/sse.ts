const clients = new Set<Client>();
const events: { id: string, data: string, type?: string }[] = []

export function connect(req: Request, info?: unknown): Response {
  const stream = new Client(info);
  clients.add(stream);
  const last = req.headers.get('Last-Event-ID')
  if (last) {
    const start = events.findIndex((v) => v.id === last)
    if (start >= 0) {
      for (const event of events.slice(start)) {
        stream.send(event.data, event.type, event.id)
      }
    }
  }
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
    },
  });
}

export function broadcast(data: string, type?: string): string {
  const id = crypto.randomUUID()
  events.push({ id, data, type })
  for (const client of clients) try {
    client.send(data, type, id);
  } catch (err) {
    clients.delete(client);
    console.log('client is dead.', err)
  }
  return id
}

class Client extends ReadableStream<Uint8Array> {
  controller?: ReadableStreamDefaultController<Uint8Array>;
  encoder = new TextEncoder();
  info?: unknown
  constructor(info?: unknown) {
    let ctrl;
    super({
      start: (controller) => {
        ctrl = controller;
      },
    });
    this.info = info
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
    this.enqueue(message);
  }
}
