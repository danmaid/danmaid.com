import { manage } from "./maid";
import { Server } from "node:http";
import express from "express";
import { rm, writeFile, mkdir, readdir, rmdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import sse, { cast } from "./sse";
import { Server as WSS, createWebSocketStream } from "ws";
import { createWriteStream } from "node:fs";
import { randomUUID } from "node:crypto";

const server = new Server();
server.on("connection", manage("connection"));
server.on("request", manage("session"));

const wss = new WSS({ server });
wss.on("connection", async (socket, req) => {
  const url = new URL(req.url || "/", "https://localhost");
  const path = join("data", url.pathname);
  await mkdir(dirname(path), { recursive: true });
  createWebSocketStream(socket).pipe(createWriteStream(path));
});

const app = express();
app.use(express.static("public"));

app.use(sse());

app.put("*", async (req, res) => {
  console.debug(">>PUT", req.path);
  const path = join("data", req.path);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, req);
  res.sendStatus(200);
  cast(req.path, undefined, "PUT");
  console.debug("<<PUT", req.path);
});
app.delete("*", async (req, res) => {
  console.debug(">>DELETE", req.path);
  const path = join("data", req.path);
  await rm(path);
  if ((await readdir(dirname(path))).length === 0) await rmdir(dirname(path));
  res.sendStatus(200);
  cast(req.path, undefined, "DELETE");
  console.debug("<<DELETE", req.path);
});
app.post("*", async (req, res) => {
  console.debug(">>POST", req.path, req.headers);
  const id = randomUUID();
  let path = [req.path, id].join(req.path.endsWith("/") ? "" : "/");
  await mkdir(dirname(join("data", path)), { recursive: true });
  await writeFile(join("data", path), req);
  res.setHeader("Location", `${req.protocol}://${req.headers.host}${path}`);
  res.sendStatus(201);
  cast(path, undefined, "POST");
  console.debug("<<POST", req.path, id);
});

app.use(express.static("data", { extensions: ["json"], index: "index.json" }));

server.on("request", app);

server.listen(6900, () => console.log("listen. http://localhost:6900"));
