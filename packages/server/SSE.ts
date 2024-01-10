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

  enqueue(string: string) {
    this.controller?.enqueue(this.encoder.encode(string));
  }

  dispatchEvent(event: MessageEvent<string>): void {
    let message = "";
    if (event.type !== "message") message += `event: ${event.type}\n`;
    message += `data: ${event.data}\n`;
    if (event.lastEventId) message += `id: ${event.lastEventId}\n`;
    message += "\n";
    this.enqueue(message);
  }
}

export class SSE {
  static isSSE(req: Request): boolean {
    return req.headers.get("accept") === "text/event-stream";
  }

  clients = new Set<SSEStream>();
  connect(): Response {
    const stream = new SSEStream();
    this.clients.add(stream);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
      },
    });
  }

  cast(event: MessageEvent<string>) {
    for (const client of this.clients)
      try {
        client.dispatchEvent(event);
      } catch (err) {
        console.warn(err);
        this.clients.delete(client);
      }
  }
}
