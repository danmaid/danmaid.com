import "./maid";
import { Server } from "node:http";
import express from "express";
import { rm, readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, basename, dirname } from "node:path";
import sse, { cast } from "./sse";
import { Server as WSS, createWebSocketStream } from "ws";
import { createWriteStream } from "node:fs";
import { manage } from "./maid";

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

app.use(express.json());
app.use(sse());

app.put("*", async (req, res) => {
  console.log("PUT", req.path);
  if (!req.body) return res.sendStatus(400);
  const path = join("data", req.path + ".json");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(req.body), { encoding: "utf-8" });
  res.sendStatus(200);
  cast(req.path, undefined, "PUT");
});
app.delete("*", async (req, res) => {
  console.log("DELETE", req.path);
  await rm(join("data", req.path + ".json"));
  res.sendStatus(200);
  cast(req.path, undefined, "DELETE");
});
app.get("*", async (req, res, next) => {
  if (!req.path.endsWith("/") || !req.accepts().includes("application/json"))
    return next();
  const files = await readdir(join("data", req.path));
  if (!req.query.include_docs)
    return res.json(files.map((v) => basename(v, ".json")));
  const mapped = files.map(async (file) => {
    try {
      const doc = await readFile(join("data", req.path, file), {
        encoding: "utf-8",
      });
      return {
        id: basename(file, ".json"),
        doc: JSON.parse(doc),
      };
    } catch {}
  });
  res.json((await Promise.all(mapped)).filter((v) => !!v));
});

app.use(express.static("data", { extensions: ["json"] }));
app.use(express.static("public"));
server.on("request", app);


server.listen(6900, () => console.log("listen. http://localhost:6900"));
