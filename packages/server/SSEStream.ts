export class SSEStream extends ReadableStream<Uint8Array> {
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
