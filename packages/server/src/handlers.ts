import { open, rm } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

const dataDir = "data";

export async function main(req: IncomingMessage, res: ServerResponse) {
  if (!req.url) {
    res.statusCode = 400;
    res.end();
    console.warn(Error("req.url is not found."));
    return;
  }
  try {
    if (req.method === "GET") {
      const fd = await open(join(dataDir, req.url));
      const stream = fd.createReadStream();
      const end = new Promise((x, y) => stream.on("error", y).on("end", x));
      stream.pipe(res);
      await end;
      return;
    }
    if (req.method === "PUT") {
      const fd = await open(join(dataDir, req.url), "w");
      const stream = fd.createWriteStream();
      const end = new Promise((x, y) => stream.on("error", y).on("finish", x));
      req.pipe(stream);
      await end;
      res.end();
      return;
    }
    if (req.method === "DELETE") {
      await rm(join(dataDir, req.url));
      res.end();
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

export async function log(req: IncomingMessage, res: ServerResponse) {
  const id = randomUUID();
  console.info(`${req.method} ${req.url} => ${id}`);
  res.once("finish", () =>
    console.info(`${id} => ${res.statusCode} ${res.statusMessage}`)
  );
}
