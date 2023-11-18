Deno.serve({ port: 6900 }, (req, info) => {
  console.log(new Date(), req, info.remoteAddr);
  const url = new URL(req.url);
  url.port = "6901";
  if (req.headers.get("accept")?.includes("text/event-stream")) {
    url.port = "6902";
  }
  if (req.headers.get("upgrade")?.includes("websocket")) {
    const { socket, response } = Deno.upgradeWebSocket(req);
    url.protocol = url.protocol.replace("http", "ws");
    url.port = "6903";
    console.log("ws", url);
    const proxy = new WebSocket(url.toString());
    proxy.onmessage = (ev) => socket.send(ev.data);
    socket.onmessage = (ev) => proxy.send(ev.data);
    proxy.onclose = (ev) => socket.close(ev.code, ev.reason);
    return response;
  }
  return fetch(url, req);

  // return new Response("", { status: 471 });
});
