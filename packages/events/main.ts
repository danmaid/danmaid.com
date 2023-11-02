const events = new EventTarget();
const encoder = new TextEncoder();

Deno.serve((req, info) => {
  if (req.headers.get("upgrade")?.includes("websocket")) {
    try {
      const { socket, response } = Deno.upgradeWebSocket(req, {
        protocol: "raw",
      });
      socket.onopen = () =>
        console.log("WebSocket: raw connected.", info.remoteAddr);
      socket.onmessage = (ev) =>
        events.dispatchEvent(new MessageEvent(ev.type, ev));
      console.log("raw mode");
      return response;
    } catch (err) {
      console.error(err);
      return new Response(undefined, { status: 501 });
    }
  }
  if (req.headers.get("accept")?.includes("text/event-stream")) {
    const stream = new ReadableStream({
      start(controller) {
        const send = (v: string) => controller.enqueue(encoder.encode(v));
        events.addEventListener("message", ((ev: MessageEvent) => {
          if (ev.type !== "message") send(`event: ${ev.type}\n`);
          send(`data: ${ev.data}\n`);
          if (ev.lastEventId) send(`id: ${ev.lastEventId}\n`);
          send("\n");
        }) as any);
        send(`retry: 1000\n`);
      },
    });
    console.log("SSE connect.", info.remoteAddr);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
      },
    });
  }
  return new Response();
});
