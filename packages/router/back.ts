Deno.serve({ port: 6901 }, (req, info) => {
  console.log(new Date(), req, info);
  return new Response("", { status: 471 });
});

Deno.serve({ port: 6902 }, (req, info) => {
  console.log(new Date(), req, info);
  return new Response("", { status: 472 });
});

Deno.serve({ port: 6903 }, (req, info) => {
  console.log(new Date(), req, info);
  //   if (req.headers.get("upgrade")?.includes("websocket")) {
  const { socket, response } = Deno.upgradeWebSocket(req);
  return response;
  //   }
  //   return new Response("", { status: 473 });
});
