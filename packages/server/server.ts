import { SSE } from "./SSE.ts";

const sse = new SSE();

Deno.serve(
  {
    port: 443,
    cert: Deno.readTextFileSync(Deno.env.get("CERT_FILE") || "localhost.crt"),
    key: Deno.readTextFileSync(Deno.env.get("KEY_FILE") || "localhost.key"),
  },
  async (req, info) => {
    const res = await handler(req);
    console.info(
      new Date().toISOString(),
      info.remoteAddr,
      req.method,
      req.url,
      "=>",
      res.status
    );
    return res;
  }
);

async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const filepath = "./data" + decodeURIComponent(url.pathname);
    if (req.method === "GET") {
      if (SSE.isSSE(req)) return sse.connect();
      const headers = await Deno.readTextFile(filepath + ".header.json")
        .then((v) => JSON.parse(v))
        .catch(() => undefined);
      const file = await Deno.open(filepath, { read: true });
      return new Response(file.readable, { headers });
    }
    if (req.method === "PUT") {
      if (req.body) await Deno.writeFile(filepath, req.body);
      const headers = JSON.stringify(req.headers);
      await Deno.writeTextFile(filepath + ".header.json", headers);
      sse.cast(new MessageEvent("PUT", { data: url.pathname }));
      return new Response();
    }
    if (req.method === "DELETE") {
      await Deno.remove(filepath);
      await Deno.remove(filepath + ".header.json");
      sse.cast(new MessageEvent("DELETE", { data: url.pathname }));
      return new Response();
    }
    if (req.method === "POST") {
      const { default: fn } = await import(filepath);
      return fn(req);
    }
    return new Response(null, { status: 501 });
  } catch (err) {
    console.warn(err);
    return new Response(null, { status: 404 });
  }
}
