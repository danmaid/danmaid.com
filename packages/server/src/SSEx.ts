import { IncomingMessage, ServerResponse } from "node:http";

export class SSE {
  clients = new Set<ServerResponse & { path: string }>();

  connect(req: IncomingMessage, res: ServerResponse) {
    if (!req.url) throw Error("invalid request url");
    const url = new URL(req.url, `http://${req.headers.host}`);
    const client = Object.assign(res, { path: url.pathname });
    this.clients.add(client);
    res.on("close", () => this.clients.delete(client));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-store");
    res.write("retry: 1000\n\n");
  }

  cast(data: string, id?: string, event?: string) {
    Array.from(this.clients)
      .filter((client) => data.startsWith(client.path))
      .forEach((client) => {
        const regex = new RegExp("^" + client.path);
        let payload = `data: ${data.replace(regex, "")}\n`;
        if (id) payload += `id: ${id}\n`;
        if (event) payload = `event: ${event}\n` + payload;
        payload = payload += "\n";
        client.write(payload);
      });
    return;
  }

  static isSSE(req: IncomingMessage): boolean {
    return !!req.headers.accept?.includes("text/event-stream");
  }
}
