import {
  createSecureServer,
  Http2ServerRequest,
  Http2ServerResponse,
} from "node:http2";
import { open, rm, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import * as rfc822 from "./rfc822";
import { Readable } from "node:stream";
import readline from "node:readline/promises";

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
const sessions = new Map();

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
        const inprogress = sessions.get(req.url);
        if (inprogress) {
          stream.pipe(res, { end: false });
          await end;
          inprogress.pipe(res);
        } else {
          stream.pipe(res);
          await end;
        }
        return;
      }
      if (req.method === "PUT") {
        const fd = await open(join(dataDir, req.url), "w");
        const stream = fd.createWriteStream();
        const end = new Promise((x, y) =>
          stream.on("error", y).on("finish", x)
        );
        sessions.set(req.url, req);
        req.pipe(stream);
        if (req.headers["content-type"]) {
          const headerFile = join(dataDir, req.url + ".header.json");
          const json = JSON.stringify({
            "Content-Type": req.headers["content-type"],
          });
          await writeFile(headerFile, json, { encoding: "utf-8" });
        }
        await end;
        sessions.delete(req.url);
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
      if (req.method === "POST") {
        if (req.url === "/decode") {
          const rfc822 = await import("@danmaid/rfc822");
          const { headers, body } = await rfc822.decode(Readable.toWeb(req));
          res.writeHead(200, headers);
          body.pipe(res);
          return;
        } // if (req.url === "/decode") {
        //   if (req.headers["content-type"] === "message/rfc822") {
        //     const id = randomUUID();
        //     const file = join(dataDir, id);
        //     const body = await open(file, "w");
        //     let isBody = false;
        //     const header: [string, string][] = [];
        //     for await (const line of readline.createInterface(req.stream)) {
        //       if (isBody) await body.write(line + "\r\n");
        //       else if (line === "") isBody = true;
        //       else {
        //         // RFC5322 2.2.3. Long Header Fields
        //         if (/^[\x20\x09]/.test(line)) {
        //           header[header.length - 1][1] += line;
        //           continue;
        //         }
        //         const [k, v] = line.split(":");
        //         header.push([k, v.trimStart()]);
        //       }
        //     }
        //     await body.close();
        //     await writeFile(
        //       file + ".header.json",
        //       JSON.stringify(Object.fromEntries(header)),
        //       { encoding: "utf-8" }
        //     );
        //     res.writeHead(201, { Location: "/" + id });
        //     res.end();
        //     return;
        //   }
        //   if (req.headers["content-type"]?.startsWith("multipart/")) {
        //     const type = req.headers["content-type"];
        //     const boundary = /boundary="(.+)"/.exec(type)?.[1];
        //     const reader = readline.createInterface(Readable.from(req));
        //     let header;
        //     let headerEnd = false;
        //     let body;
        //     for await (const line of reader) {
        //       if (line.startsWith(`--${boundary}`)) {
        //         if (line.endsWith("--")) {
        //           // end
        //         } else {
        //           // (re)start
        //           if (header) {
        //             // save
        //           }
        //           header = {};
        //           headerEnd = false;
        //           body = undefined;
        //         }
        //         continue;
        //       }
        //       if (headerEnd) {
        //         // body
        //         body = body ? body + line : line;
        //         continue;
        //       } else {
        //         if (line === "") {
        //           headerEnd = true;
        //           continue;
        //         }
        //         // header
        //       }
        //     }
        //     res.writeHead(300, {
        //       link: ["</xxx>; type=text/plain", "</yyy>; type=text/html"],
        //     });
        //     res.end();
        //     return;
        //   }
        // }
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
