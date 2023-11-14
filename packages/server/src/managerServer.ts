import express from "express";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { Server as WebSocketServer } from "ws";
import { Console } from "node:console";
import { writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { PassThrough } from "node:stream";

const app = express();
export const manager = createServer(app);
const wss = new WebSocketServer({ server: manager });

class Logger extends Console {
  constructor() {
    super({ stdout: process.stdout, stderr: process.stderr });
  }
  log(...args: any[]): void {
    return super.log(`[manager]`, new Date().toISOString(), ...args);
  }
}

const console = new Logger();
const events = new Map([["/", new PassThrough({ objectMode: true })]]);

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} ${req.httpVersion}`);
  res.on("finish", () =>
    console.log(
      `${req.method} ${req.url} => ${res.statusCode} ${res.statusMessage}`
    )
  );
  next();
});
app.get("*", (req, res, next) => {
  if (!req.accepts().includes("text/event-stream")) return next();
  const stream = getEventStream(req.path);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-store");
  res.write("retry: 1000\n\n");
  stream.on("data", (v) => res.write(`event: ${v.event}\ndata: ${v.id}\n\n`));
});
app.use(express.static("public"));
app.use(express.static("data", { index: "index.json" }));
app.get("*/index.json", async (req, res, next) => {
  try {
    const items = await readdir(dirname(join("data", req.path)));
    res.json(items);
    next();
  } catch {
    next();
  }
});
app.put(/[^\/]$/, async (req, res, next) => {
  await mkdir(dirname(join("data", req.path)), { recursive: true });
  await writeFile(join("data", req.path), req);
  res.sendStatus(200);
  const id = req.path.match(/\/([^\/]*)$/)?.[1];
  if (id) getEventStream(req.path).push({ event: "PUT", id });
  next();
});
app.post(/\/$/, async (req, res, next) => {
  await mkdir(join("data", req.path), { recursive: true });
  const id = randomUUID();
  await writeFile(join("data", req.path, id), req);
  const url = new URL(req.url, `http://${req.headers.host}`);
  url.pathname += req.path.endsWith("/") ? id : `/${id}`;
  res.setHeader("Location", url.href);
  res.status(201);
  res.send(id);
  console.log("Create new ID", id);
  getEventStream(req.path).push({ event: "POST", id });
  next();
});
app.delete("*", async (req, res, next) => {
  try {
    await rm(join("data", req.path));
    const id = req.path.match(/\/([^\/]*)$/)?.[1];
    if (id) getEventStream(req.path).push({ event: "DELETE", id });
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
  next();
});

function getEventStream(path: string): PassThrough {
  const stream = events.get(path);
  if (stream) return stream;
  const created = new PassThrough({ objectMode: true });
  const parent = getEventStream(path.replace(/[^\/]*\/?$/, ""));
  created.pipe(parent);
  events.set(path, created);
  return created;
}
