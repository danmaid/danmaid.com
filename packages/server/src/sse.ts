import type { Response, RequestHandler } from "express";

const clients = new Set<Response>();

export default (): RequestHandler => (req, res, next) => {
  if (!req.header("accept")?.includes("text/event-stream")) return next();
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store",
  });
  res.write("retry: 1000\n\n");
  clients.add(res);
  res.on("close", () => clients.delete(res));
  console.log("SSE connected.");
};

export function cast(data: string, id?: string, event?: string) {
  Array.from(clients)
    .filter((res) => data.startsWith(res.req.path))
    .forEach((res) => {
      const regex = new RegExp("^" + res.req.path);
      let payload = `data: ${data.replace(regex, "")}\n`;
      if (id) payload += `id: ${id}\n`;
      if (event) payload = `event: ${event}\n` + payload;
      payload = payload += "\n";
      res.write(payload);
    });
  return;
}
