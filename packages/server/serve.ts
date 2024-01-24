import { join, dirname } from "https://deno.land/std@0.212.0/path/mod.ts";
import { SSEStream } from "./SSEStream.ts";
import { StoreEvent } from "./events.ts";
import { load, save } from "./filestore.ts";

// console.debug = () => {};

const dataDir = "./data";
const headerExt = ".header.json";

class RequestInfo {
  constructor(public request: Request, public info: Deno.ServeHandlerInfo) {}
  readonly id = crypto.randomUUID();
  readonly timestamp = new Date();
  get method() {
    return this.request.method;
  }
  get url() {
    return this.request.url;
  }
  get headers() {
    return this.request.headers;
  }
  get remote() {
    return this.info.remoteAddr;
  }
}
class ResponseInfo {
  constructor(public response: Response, public request: RequestInfo) {}
  readonly timestamp = new Date();
  get status() {
    return this.response.status;
  }
  get headers() {
    return this.response.headers;
  }
}

Deno.serve(
  {
    port: 443,
    cert: Deno.readTextFileSync(Deno.env.get("CERT_FILE") || "localhost.crt"),
    key: Deno.readTextFileSync(Deno.env.get("KEY_FILE") || "localhost.key"),
  },
  async (req, info) => {
    const requestInfo = new RequestInfo(req, info);
    accessLog(requestInfo);
    broadcast(requestInfo);
    const res: Response = await handler(req);
    const responseInfo = new ResponseInfo(res, requestInfo);
    accessLog(responseInfo);
    broadcast(responseInfo);
    return res;
  }
);

async function handler(req: Request): Promise<Response> {
  const { method } = req;
  try {
    if (method === "GET") {
      const { headers } = req;
      const accept = headers.get("accept");
      // Connect SSE
      if (accept === "text/event-stream") return connect(req);
      // Content-Type Negotiation
      if (accept && accept !== "*/*") {
        const { url } = req;
        let res;
        for (const type of parseAccept(accept)) {
          try {
            const request =
              type === "*/*"
                ? req
                : type.endsWith("/*")
                ? new Request(`${url}/${type.split("/", 1)[0]}`)
                : new Request(`${url}/${type}`);
            res = await get(request);
            break;
          } catch (err) {
            console.debug(err);
            continue;
          }
        }
        return res ? res : new Response(null, { status: 404 });
      }
      // Permanent
      return await get(req);
    }
    if (method === "PUT") {
      {
        const path = await resolve(req);
        const meta = Object.fromEntries(req.headers);
        const body = await getBody(req.body).catch(() => undefined);
        await save(path, meta, body);
        console.log("saved.", path);
        dispatchEvent(new StoreEvent(path, meta));

        const reqpath = decodeURIComponent(new URL(req.url).pathname);
        if (reqpath === path) return new Response();
        try {
          const { meta: m } = await load(reqpath, false);
          // dispatch default
          if (m["content-location"] === path) {
            dispatchEvent(new StoreEvent(reqpath, meta));
          }
        } catch {
          // set default if not exist.
          await save(reqpath, { "content-location": path });
          dispatchEvent(new StoreEvent(reqpath, meta));
        }
        return new Response();
      }
      {
        const { url, headers, body } = req;
        const path = decodeURIComponent(new URL(url).pathname);
        // Content-Type Negotiation
        if (headers.has("content-type")) {
          const type =
            headers.get("content-type")?.split(";")[0] ||
            "application/octet-stream";
          const contentPath = join(dataDir, path, type);

          await Deno.mkdir(dirname(contentPath), { recursive: true });
          try {
            const body = await getBody(req.body);
            const file = await Deno.open(contentPath, {
              write: true,
              truncate: true,
              create: true,
            });
            await body.pipeTo(file.writable);
          } catch {
            console.log("body is empty.");
          }
          const meta = Object.fromEntries(headers);
          if (Object.keys(meta).length > 0)
            await Deno.writeTextFile(
              contentPath + headerExt,
              JSON.stringify(meta)
            );
          dispatchEvent(new StoreEvent(`${path}/${type.trim()}`, meta));
          {
            // store default
            const filePath = join(dataDir, path + headerExt);
            try {
              await Deno.stat(filePath);
            } catch {
              const meta = { "content-location": `${path}/${type.trim()}` };
              await Deno.writeTextFile(filePath, JSON.stringify(meta));
              dispatchEvent(new StoreEvent(path, meta));
            }
            return new Response(null, { status: 200 });
          }
        }
        // Permanent
        {
          const meta = Object.fromEntries(headers);
          await save(path, meta, await getBody(body).catch(() => undefined));
          dispatchEvent(new StoreEvent(path, meta));
        }
      }
    }
    if (method === "DELETE") {
      const { url } = req;
      const path = decodeURIComponent(new URL(url).pathname);
      const filepath = join(dataDir, path);
      const x = Deno.remove(filepath);
      const y = Deno.remove(filepath + headerExt);
      const z = await Promise.allSettled([x, y]);
      if (z.every((v) => v.status === "rejected")) throw Error("not found.");
      return new Response(null, { status: 200 });
    }
    return new Response(null, { status: 501 });
  } catch (err) {
    console.debug(err);
    return new Response(null, { status: 404 });
  }
}

async function resolve({ url, headers }: Request): Promise<string> {
  const path = decodeURIComponent(new URL(url).pathname);
  const type = headers.get("content-type")?.split(";")[0];
  return await resolveLocation(type ? `${path}/${type}` : path);
}

async function resolveLocation(path: string): Promise<string> {
  const { meta } = await load(path, false).catch(() => ({ meta: {} }));
  return meta["content-location"] || path;
}

async function get(req: Request): Promise<Response> {
  const { url } = req;
  const path = join(dataDir, decodeURIComponent(new URL(url).pathname));
  const xx = await Deno.readTextFile(path + headerExt);
  const headers = new Headers(JSON.parse(xx));

  const cl = headers.get("content-location");
  if (cl) {
    const res = await get(new Request(new URL(cl, url)));
    headers.forEach((v, k) => res.headers.set(k, v));
    return res;
  }
  const file = await Deno.open(path, { read: true });
  const stat = await file.stat();
  console.debug("stat", stat);
  if (stat.isDirectory) {
    file.close();
    return new Response(null, { status: 200, headers });
  }
  return new Response(file.readable, { status: 200, headers });
}

function parseAccept(accept: string): string[] {
  return accept
    .split(",")
    .map((v) => {
      const [type, q] = v.split(";q=");
      const quality = q ? parseFloat(q) || 1 : 1;
      return { type, quality };
    })
    .sort((a, b) => b.quality - a.quality)
    .map((v) => v.type.trim());
}

function accessLog(info: RequestInfo | ResponseInfo) {
  const columns: unknown[] = [info.timestamp];
  info instanceof RequestInfo
    ? columns.push("request", info.id, ":=", info.method, info.url, info.remote)
    : columns.push("response", info.request.id, "=>", info.status);
  console.info(...columns);
  console.debug(Object.fromEntries(info.headers));
}

const clients = new Set<SSEStream>();
function connect(req: Request): Response {
  const stream = new SSEStream();
  clients.add(stream);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
    },
  });
}
function broadcast(info: RequestInfo | ResponseInfo) {
  const { timestamp } = info;
  const data: Record<string, unknown> = { timestamp };
  if (info instanceof RequestInfo) {
    data.id = info.id;
    data.remote = info.remote;
    data.method = info.method;
    data.url = info.url;
  } else {
    data.request = info.request.id;
    data.status = info.status;
  }
  data.headers = Object.fromEntries(info.headers);
  for (const client of clients)
    try {
      client.send(JSON.stringify(data), "response");
    } catch {
      clients.delete(client);
    }
}
addEventListener("stored", (ev) => {
  if (!(ev instanceof StoreEvent)) return;
  for (const client of clients)
    try {
      client.send(ev.path, "stored");
    } catch {
      clients.delete(client);
    }
});

const indexType = "application/vnd.danmaid.index+json";
addEventListener("stored", (ev) => {
  if (!(ev instanceof StoreEvent)) return;
  const { path, meta } = ev;
  if (meta["content-type"] === indexType) return;
  async function updateIndex(path: string) {
    const i = path.lastIndexOf("/");
    if (i < 0) return;
    const indexPath = path.slice(0, i);
    const name = path.slice(i + 1);
    const indexFile = join(dataDir, indexPath, indexType);
    try {
      const text = await Deno.readTextFile(indexFile);
      const index = JSON.parse(text);
      if (!Array.isArray(index)) throw Error("is not array");
      const i = index.findIndex((v) => v.id === name);
      if (i >= 0) index.splice(i, 1);
      index.push({ ...meta, id: name });
      await Deno.writeTextFile(indexFile, JSON.stringify(index));
      const header = { "content-type": indexType };
      await Deno.writeTextFile(indexFile + headerExt, JSON.stringify(header));
    } catch (err) {
      console.debug(err);
      await Deno.mkdir(dirname(indexFile), { recursive: true });
      const index = [{ ...meta, id: name }];
      await Deno.writeTextFile(indexFile, JSON.stringify(index));
      const header = { "content-type": indexType };
      await Deno.writeTextFile(indexFile + headerExt, JSON.stringify(header));
    }
    console.log("index updated.", indexPath + "/", name);
    updateIndex(indexPath);
  }
  updateIndex(path);
});

async function getBody(
  readable?: ReadableStream | null
): Promise<ReadableStream> {
  if (!readable) throw Error("not found.");
  const [x, y] = readable.tee();
  const r = y.getReader();
  const { done } = await r.read();
  r.cancel();
  if (done) throw Error("empty.");
  return x;
}
