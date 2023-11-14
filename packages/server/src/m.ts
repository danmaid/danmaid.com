process.env.MANAGER = "http://localhost:6900";

import { ManagedServer } from "./ManagedServer";
import express from "express";
import { writeFile, mkdir, readdir, rm, open } from "node:fs/promises";
import { join, dirname } from "node:path";
import { PassThrough } from "node:stream";
import { randomUUID } from "node:crypto";

const app = express();
const server = new ManagedServer(app);
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
  try {
    await mkdir(dirname(join("data", req.path)), { recursive: true });
    const file = await open(join("data", req.path), "w");
    req.pipe(file.createWriteStream());

    res.sendStatus(200);
    const id = req.path.match(/\/([^\/]*)$/)?.[1];
    if (id) getEventStream(req.path).push({ event: "PUT", id });
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
  next();
});
app.post(/\/$/, async (req, res, next) => {
  try {
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
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
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

server.listen(6900, () => {
  console.log("server started. http://localhost:6900");
});
