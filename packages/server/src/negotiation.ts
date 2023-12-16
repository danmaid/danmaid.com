import http, { IncomingMessage, ServerResponse } from "node:http";
import https, { RequestOptions } from "node:https";

export async function negotiation(this: ServerResponse, req: IncomingMessage) {
  const base = req.url;
  if (!base) throw Error("url is not found.");
  const accepts = req.headers.accept?.split(",") || ["*/*"];
  for (const accept of accepts) {
    const mediaType = accept.match(/([^ ;]+)/)?.[1];
    if (!mediaType) continue;
    const [type, subtype] = mediaType.split("/");
    try {
      if (type === "*") return await multiple.call(this, base);
      if (subtype === "*") return await multiple.call(this, `${base}/${type}`);
      const res = await request(`${base}/${mediaType}`);
      if (!res.statusCode) throw Error("statusCode not found.");
      this.writeHead(res.statusCode, res.headers);
      res.pipe(this);
      return;
    } catch {}
  }
}

async function multiple(this: ServerResponse, path: string): Promise<void> {
  const headers = { accept: "application/vnd.danmaid.index+json" };
  const res = await fetch(path, { headers });
  const index = await res.json();
  if (!Array.isArray(index)) throw Error("index is not array.");
  const def = index.find((v) => v.default);
  if (typeof def?.location === "string") {
    const res = await request(def.location);
    if (!res.statusCode) throw Error("statusCode not found.");
    this.writeHead(res.statusCode, res.headers);
    res.pipe(this);
    return;
  }
  this.statusCode = 300;
  this.setHeader("Content-Type", "application/vnd.danmaid.index+json");
  this.end(JSON.stringify(index));
}

async function request(
  url: string,
  options: RequestOptions = {}
): Promise<IncomingMessage> {
  const request = url.startsWith("https") ? https.request : http.request;
  return new Promise((resolve, reject) => {
    request(url, options, resolve).on("error", reject);
  });
}
