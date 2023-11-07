import { randomUUID } from "node:crypto";
import type { Socket } from "node:net";
import type { IncomingMessage, RequestListener } from "node:http";
import { Logger } from "./Logger";
import { isLoopback } from "./client";
import { Manager } from "./Manager";

const host = "localhost:6900";

const id = randomUUID();
console.log("id", id);
const logger = new Logger(`ws://${host}/${id}`);
globalThis.console = logger;

export async function close() {
  logger.close();
}

export function manage(type: "connection"): ReturnType<typeof manageConnection>;
export function manage(type: "session"): ReturnType<typeof manageSession>;
export function manage(type: string) {
  if (type === "connection") return manageConnection();
  if (type === "session") return manageSession();
}

let connections: Manager<Socket> | undefined;
function manageConnection() {
  const manager = new Manager<Socket>(`http://${host}/connections`, {
    serializer: (socket) => ({
      address: socket.remoteAddress,
      family: socket.remoteFamily,
      port: socket.remotePort,
    }),
  });
  connections = manager;
  return async (socket: Socket) => {
    if (await isLoopback(socket)) return;
    socket.on("close", () => added.then(() => manager.delete(socket)));
    Object.assign(socket, { close: socket.destroy });
    const added = manager.add(socket);
  };
}

function manageSession(): RequestListener {
  const connnectionManager = connections;
  const serializer = connnectionManager
    ? (req: IncomingMessage) => ({
        method: req.method,
        url: req.url,
        version: req.httpVersion,
        // headers: req.headers,
        connection: connnectionManager.getId(req.socket),
      })
    : (req: IncomingMessage) => ({
        method: req.method,
        url: req.url,
        version: req.httpVersion,
        // headers: req.headers,
      });
  const requests = new Manager(`http://${host}/requests`, { serializer });
  return async (req, res) => {
    const id = req.headers["request-id"];
    if (typeof id === "string" && (await isLoopback(id))) return;
    res.on("close", () => added.then(() => requests.delete(req)));
    Object.assign(req, { close: res.destroy });
    const added = requests.add(req);
  };
}
