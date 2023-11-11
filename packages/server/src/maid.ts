import type { Socket } from "node:net";
import type { IncomingMessage } from "node:http";
import { Connectable, Logger } from "./Logger";
import { fetch, isLoopback } from "./client";
import EventSource from "eventsource";
import indexer from "./indexer";

const host = "localhost:6900";
const managed = new Map<
  NodeJS.Process | Socket | IncomingMessage,
  Promise<string>
>();

const logger = new Logger();
globalThis.console = logger;

managed.set(process, registerProcess());

const events = new EventSource(`http://${host}`);
events.addEventListener("DELETE", (ev) => remove(ev.data));
indexer();

async function registerProcess(): Promise<string> {
  const register = async (k: Connectable): Promise<string> => {
    const url = await registerItem(`http://${host}/logs`);
    logger[k].connect(url);
    return url;
  };

  const logs: Connectable[] = ["log"];
  // const logs: Connectable[] = ["log", "debug", "info", "warn", "error"];
  const payload = Object.fromEntries(
    await Promise.all(logs.map(async (k) => [k, await register(k)]))
  );
  return await registerItem(`http://${host}/processes`, payload);
}

export async function registerItem(
  url: string,
  payload?: unknown
): Promise<string> {
  console.debug(">>registerItem");
  const res = payload
    ? await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    : await fetch(url, { method: "POST" });
  if (res.statusCode !== 201) throw Error("status code !== 201");
  if (!res.headers.location) throw Error("Location header not found.");
  console.debug("<<registerItem", res.headers.location);
  return res.headers.location;
}

async function remove(url: string) {
  const finder = <T>([k, v]: [T, Promise<string>]): Promise<T> =>
    new Promise((ok, ng) => v.then((v) => (v === url ? ok(k) : ng())));

  const item = await Promise.any(Array.from(managed).map(finder));
  if (!item) return console.log("already removed.", url);
  if ("destroy" in item) item.destroy();
  managed.delete(item);
  console.log("removed.", url);
}

export async function close() {
  logger.destroy();
}

export function manage(type: "connection"): (socket: Socket) => void;
export function manage(type: "session"): (req: IncomingMessage) => void;
export function manage(type: string) {
  if (type === "connection")
    return (socket: Socket) => {
      const manage = manageConnection(socket);
      managed.set(socket, manage);
      manage.catch((err) => {
        console.warn("manage failed.", err);
        managed.delete(socket);
      });
    };
  if (type === "session") {
    return (req: IncomingMessage) => {
      const manage = manageSession(req);
      managed.set(req, manage);
      manage.catch((err) => {
        console.warn("manage failed.", err);
        managed.delete(req);
      });
    };
  }
}

async function manageConnection(socket: Socket): Promise<string> {
  if (await isLoopback(socket)) throw Error("ignore loopback.");
  socket.on("close", async () => {
    const url = await added;
    console.log(">>closeConnection", url);
    const res = await fetch(url, { method: "DELETE" });
    if (res.statusCode !== 200) throw Error("status code !== 200");
  });
  const added = registerItem(`http://${host}/connections`, {
    address: socket.remoteAddress,
    family: socket.remoteFamily,
    port: socket.remotePort,
    process: await managed.get(process),
  });
  return added;
}

async function manageSession(req: IncomingMessage): Promise<string> {
  console.debug(">>manageSession");
  const id = req.headers["request-id"];
  if (typeof id === "string" && (await isLoopback(id)))
    throw Error("ignore loopback.");
  req.on("close", async () => {
    const url = await added;
    console.log(">>closeSession", url);
    const res = await fetch(url, { method: "DELETE" });
    if (res.statusCode !== 200) throw Error("status code !== 200");
  });
  console.debug("DEBUG", await managed.get(req.socket));
  const added = registerItem(`http://${host}/sessions`, {
    method: req.method,
    url: req.url,
    version: req.httpVersion,
    headers: req.headers,
    connection: await managed.get(req.socket),
    process: await managed.get(process),
  });
  console.debug("<<manageSession");
  return added;
}
