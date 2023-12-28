import {
  createSecureServer,
  Http2ServerRequest,
  Http2ServerResponse,
} from "node:http2";
import { open, rm, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const dataDir = "data";
const port = 443;

class SSE extends Set<Http2ServerResponse> {
  add(res: Http2ServerResponse): this {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
    });
    res.write("retry: 5000\n");
    res.on("close", () => this.delete(res));
    console.log("SSE connected.");
    return super.add(res);
  }

  cast(req: Http2ServerRequest): void {
    this.forEach((res) => {
      res.write(`event: ${req.method}\n`);
      res.write(`data: ${req.url}\n`);
      res.write(`\n`);
    });
  }
}

const clients = new SSE();

export const server = createSecureServer(
  { allowHTTP1: true },
  async (req, res) => {
    if (!req.url) {
      res.statusCode = 400;
      res.end();
      console.warn(Error("req.url is not found."));
      return;
    }
    try {
      if (req.method === "GET") {
        if (req.headers.accept === "text/event-stream") return clients.add(res);
        const fd = await open(join(dataDir, req.url));
        const stream = fd.createReadStream();
        const end = new Promise((x, y) => stream.on("error", y).on("end", x));
        try {
          const headerFile = join(dataDir, req.url + ".header.json");
          const json = await readFile(headerFile, { encoding: "utf-8" });
          const headers: Record<string, string> = JSON.parse(json);
          Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
        } catch {}
        stream.pipe(res);
        await end;
        return;
      }
      if (req.method === "PUT") {
        const fd = await open(join(dataDir, req.url), "w");
        const stream = fd.createWriteStream();
        const end = new Promise((x, y) =>
          stream.on("error", y).on("finish", x)
        );
        req.pipe(stream);
        if (req.headers["content-type"]) {
          const headerFile = join(dataDir, req.url + ".header.json");
          const json = JSON.stringify({
            "Content-Type": req.headers["content-type"],
          });
          await writeFile(headerFile, json, { encoding: "utf-8" });
        }
        await end;
        res.end();
        clients.cast(req);
        return;
      }
      if (req.method === "DELETE") {
        await rm(join(dataDir, req.url));
        res.end();
        clients.cast(req);
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
  }
);

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
