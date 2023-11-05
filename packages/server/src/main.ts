import { Server } from "node:http";
import express from "express";
import { rm, readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { isLoopback } from "./client";
import { Manager } from "./Manager";
import sse, { cast } from "./sse";
import type { Socket } from "node:net";
import type { IncomingMessage } from "node:http";

const app = express();

app.use(express.json());
app.use(sse());

app.put("*", async (req, res) => {
  console.log("PUT", req.path);
  if (!req.body) return res.sendStatus(400);
  await writeFile(join("data", req.path + ".json"), JSON.stringify(req.body), {
    encoding: "utf-8",
  });
  res.sendStatus(200);
  cast(req.path, undefined, "added");
});
app.delete("*", async (req, res) => {
  console.log("DELETE", req.path);
  await rm(join("data", req.path + ".json"));
  res.sendStatus(200);
  cast(req.path, undefined, "deleted");
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

const server = new Server();
server.on("request", app);

const connections = new Manager<Socket>("http://localhost:6900/connections", {
  serializer: (socket) => ({
    address: socket.remoteAddress,
    family: socket.remoteFamily,
    port: socket.remotePort,
  }),
});
server.on("connection", async (socket) => {
  if (await isLoopback(socket)) return;
  socket.on("close", () => added.then(() => connections.delete(socket)));
  const added = connections.add(socket);
});

const requests = new Manager<IncomingMessage>(
  "http://localhost:6900/requests",
  {
    serializer: (req) => ({
      method: req.method,
      url: req.url,
      version: req.httpVersion,
      // headers: req.headers,
      connection: connections.getId(req.socket),
    }),
  }
);
server.on("request", async (req, res) => {
  const id = req.headers["request-id"];
  if (typeof id === "string" && (await isLoopback(id))) return;
  res.on("close", () => added.then(() => requests.delete(req)));
  const added = requests.add(req);
});

server.listen(6900, () => console.log("listen. http://localhost:6900"));
