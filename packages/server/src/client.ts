import { randomUUID } from "node:crypto";
import { IncomingMessage, RequestOptions, ClientRequest } from "node:http";
import { Socket } from "node:net";
import http from "node:http";
import https from "node:https";

const sockets = new Set<Socket>();
const requests = new Set<string>();

export function isLoopbackSocket(socket: Socket): boolean {
  if (sockets.has(socket)) return true;
  for (const s of sockets) {
    if (s.localFamily !== socket.remoteFamily) continue;
    if (s.localAddress !== socket.remoteAddress) continue;
    if (s.localPort !== socket.remotePort) continue;
    return true;
  }
  return false;
}

export function isLoopbackRequest(req: IncomingMessage): boolean {
  const id = req.headers["request-id"];
  if (!id) return false;
  if (typeof id === "string") return requests.has(id);
  if (Array.isArray(id)) return id.some((v) => requests.has(v));
  return false;
}

export function request(
  options: https.RequestOptions | string | URL,
  callback?: (res: http.IncomingMessage) => void
): http.ClientRequest;
export function request(
  url: string | URL,
  options: https.RequestOptions,
  callback?: (res: http.IncomingMessage) => void
): http.ClientRequest;
export function request(
  url: https.RequestOptions | string | URL,
  ...rest: any[]
): ClientRequest {
  const req = url.toString().startsWith("https")
    ? https.request(url, ...rest)
    : http.request(url, ...rest);
  req.on("socket", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  const id = randomUUID();
  req.setHeader("Request-Id", id);
  requests.add(id);
  req.on("close", () => requests.delete(id));
  return req;
}

export async function fetch(
  url: string,
  { body, ...options }: RequestOptions & { body?: string } = {}
): Promise<
  IncomingMessage & { text(): Promise<string>; json<T>(): Promise<T> }
> {
  const res = await new Promise<IncomingMessage>(async (resolve, reject) => {
    console.log("fetch", url, options);
    const req = request(url, options, resolve);
    if (body) req.write(body);
    req.end();
  });
  return Object.assign(res, { text, json });
}

async function text(this: IncomingMessage): Promise<string> {
  let data = "";
  for await (const chunk of this) data += chunk;
  return data;
}

async function json<T = any>(this: IncomingMessage): Promise<T> {
  const string = await text.apply(this);
  return JSON.parse(string);
}
