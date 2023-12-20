import { createServer } from "node:https";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import * as store from "@danmaid/store";

const port = 443;

const server = createServer(async (req, res) => {
  if (!req.url) {
    res.statusCode = 400;
    res.end();
    console.warn(Error("req.url is not found."));
    return;
  }
  try {
    if (req.method === "GET") {
      const data = await store.get(req.url);
      const type = await getContentType(req.url).catch(() => undefined);
      if (type) res.setHeader("Content-Type", type);
      data.pipe(res);
      return;
    }
    if (req.method === "PUT") {
      await store.set(req.url, req, req.headers);
      res.writeHead(200).end();
      return;
    }
    if (req.method === "DELETE") {
      await store.remove(req.url);
      res.writeHead(200).end();
      return;
    }
    res.statusCode = 501;
    res.end();
  } catch (err) {
    res.statusCode = 404;
    res.end();
    console.warn(err);
    return;
  }
});

async function getContentType(id: string): Promise<string> {
  const meta = await store.getMeta(id);
  if (!meta || typeof meta !== "object") throw Error("meta file is not found.");
  if ("Content-Type" in meta) {
    if (typeof meta["Content-Type"] === "string") return meta["Content-Type"];
  }
  const type = Object.entries(meta).find(
    ([k, v]) => k.toLowerCase() === "content-type" && typeof v === "string"
  );
  if (!type) throw Error("Content-Type is not found.");
  return type[1];
}

const certFile = process.env.CERT_FILE || "localhost.crt";
const keyFile = process.env.KEY_FILE || "localhost.key";

server.on("request", (req, res) => {
  const id = randomUUID();
  console.info(`${req.method} ${req.url} => ${id}`);
  res.once("finish", () =>
    console.info(`${id} => ${res.statusCode} ${res.statusMessage}`)
  );
});

async function start(retry = 10) {
  try {
    const cert = await readFile(certFile);
    const key = await readFile(keyFile);
    server.setSecureContext({ cert, key });
    console.log("set. cert, key");
  } catch {
    await new Promise((r) => setTimeout(r, 3000));
    if (retry > 0) return start(retry - 1);
    throw Error("give up.");
  }

  await new Promise<void>((r) => server.listen(port, r));
  console.log("server started.");
}

start();
