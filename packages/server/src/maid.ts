import { randomUUID } from "node:crypto";
import type { Socket } from "node:net";
import type { IncomingMessage, RequestListener } from "node:http";
import { Logger } from "./Logger";
import { fetch, isLoopback, setWait, setDefaults } from "./client";
import EventSource from "eventsource";
import { PassThrough } from "node:stream";

const host = "localhost:6900";

startIndexer();

async function start() {
  const mimeType = "application/vnd.danmaid.process+json";
  const res = await fetch(`http://${host}`, {
    method: "POST",
    headers: { "Content-Type": mimeType },
  });
  if (res.statusCode !== 201) throw Error("status code !== 201");
  if (!res.headers.location) throw Error("Location header not found.");
  res.headers.location;
  setDefaults({
    headers: { link: `<${res.headers.location}> type="${mimeType}"` },
  });
  console.log("set Process", res.headers.location);
  const events = new EventSource(res.headers.location);
  events.addEventListener("DELETE", (ev) => remove(ev.data));
}
setWait(start());

async function startIndexer() {
  const queue = new PassThrough({ objectMode: true });
  const events = new EventSource(`http://${host}/`);
  events.addEventListener("PUT", (ev) => queue.push(["set", ev.data]));
  events.addEventListener("DELETE", (ev) => queue.push(["delete", ev.data]));
  events.addEventListener("POST", (ev) => queue.push(["set", ev.data]));

  for await (const [action, url] of queue) {
    console.log(">>index", url);
    const regexp = /([^/]+)$/;
    const id = url.match(regexp)?.[1];
    if (!id || id === "index.json") continue;
    const indexUrl = `http://${host}/` + url.replace(regexp, "index.json");
    const res = await fetch(indexUrl);
    const init = res.statusCode === 200 ? await res.json<string[]>() : [];
    const index = new Set(init);
    if (index.has(id)) continue;
    action === "set" ? index.add(id) : index.delete(id);
    if (index.size > 0) {
      await fetch(indexUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Array.from(index)),
      });
    } else await fetch(indexUrl, { method: "DELETE" });

    console.log("<<index");
  }
}

async function remove(url: string) {
  const finder = <T>([k, v]: [T, Promise<string>]): Promise<T> =>
    new Promise((ok, ng) => v.then((v) => (v === url ? ok(k) : ng())));

  const item = await Promise.any(Array.from(managed).map(finder));
  if (!item) return console.log("already removed.", url);
  item.destroy();
  managed.delete(item);
  console.log("removed.", url);
}

const id = randomUUID();
const logger = new Logger(`ws://${host}/${id}`);
globalThis.console = logger;

export async function close() {
  logger.close();
}

const managed = new Map<Socket | IncomingMessage, Promise<string>>();

export function manage(type: "connection"): ReturnType<typeof manageConnection>;
export function manage(type: "session"): ReturnType<typeof manageSession>;
export function manage(type: string) {
  if (type === "connection") return manageConnection();
  if (type === "session") return manageSession();
}

function manageConnection() {
  return async (socket: Socket) => {
    if (await isLoopback(socket)) return;
    socket.on("close", async () => {
      const url = await added;
      console.log(">>closeConnection", url);
      const res = await fetch(url, { method: "DELETE" });
      if (res.statusCode !== 200) throw Error("status code !== 200");
    });
    const added = createConnection(socket);
    managed.set(socket, added);
  };
}

async function createConnection(socket: Socket): Promise<string> {
  console.log(">>createConnection");
  const res = await fetch(`http://${host}/connections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: socket.remoteAddress,
      family: socket.remoteFamily,
      port: socket.remotePort,
    }),
  });
  if (res.statusCode !== 201) throw Error("status code !== 201");
  if (!res.headers.location) throw Error("Location header not found.");
  console.log("<<createConnection", res.headers.location);
  return res.headers.location;
}

function manageSession(): RequestListener {
  return async (req, res) => {
    const id = req.headers["request-id"];
    if (typeof id === "string" && (await isLoopback(id))) return;
    req.on("close", async () => {
      const url = await added;
      console.log(">>closeSession", url);
      const res = await fetch(url, { method: "DELETE" });
      if (res.statusCode !== 200) throw Error("status code !== 200");
    });
    const added = createSession(req);
    managed.set(req, added);
  };
}

async function createSession(req: IncomingMessage): Promise<string> {
  console.log(">>createSession");
  const res = await fetch(`http://${host}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      method: req.method,
      url: req.url,
      version: req.httpVersion,
      headers: req.headers,
      connection: await managed.get(req.socket),
    }),
  });
  if (res.statusCode !== 201) throw Error("status code !== 201");
  if (!res.headers.location) throw Error("Location header not found.");
  console.log("<<createSession", res.headers.location);
  return res.headers.location;
}
