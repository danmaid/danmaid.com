import { request } from "node:http";
import { randomUUID } from "node:crypto";
import type {
  IncomingMessage,
  RequestOptions,
  ClientRequest,
  OutgoingHttpHeaders,
} from "node:http";
import type { Socket } from "node:net";

const locals: Set<string> = new Set();
const connecting: Set<Promise<unknown>> = new Set();

function addrToString(addr?: string, family?: string, port?: number): string {
  return `${family === "IPv6" ? `[${addr}]` : addr}:${port}`;
}

function getLocalAddr(s: Socket): string {
  return addrToString(s.localAddress, s.localFamily, s.localPort);
}

function getRemoteAddr(s: Socket): string {
  return addrToString(s.remoteAddress, s.remoteFamily, s.remotePort);
}

async function getConnection(req: ClientRequest): Promise<Socket> {
  const connection = new Promise<Socket>((resolve) => {
    req.once("socket", (socket) => {
      if (!socket.connecting) return resolve(socket);
      socket.once("connect", () => resolve(socket));
    });
  });
  connecting.add(connection);
  connection.then(() => connecting.delete(connection));
  return connection;
}

interface FetchOptions {
  headers?: OutgoingHttpHeaders;
}

let defaults: FetchOptions | undefined;
export function setDefaults(options: FetchOptions) {
  defaults = options;
}
function getOptions(options: FetchOptions): FetchOptions {
  if (!defaults) return options;
  return {
    ...options,
    headers: { ...defaults.headers, ...options.headers },
  };
}

let wait = Promise.resolve();
export function setWait(promise: Promise<any>) {
  wait = promise;
}

export function fetch(
  url: string,
  options: RequestOptions & { body?: string } = {}
): Promise<
  IncomingMessage & { text(): Promise<string>; json<T>(): Promise<T> }
> {
  return new Promise(async (resolve, reject) => {
    await wait;
    console.log("fetch", url);
    const requestId = randomUUID();
    const req = request(url, getOptions(options), (res) => {
      resolve(Object.assign(res, { text, json }));
    });
    req.setHeader("Request-Id", requestId);
    if (options.body) req.write(options.body);
    req.end();

    locals.add(requestId);
    const socket = await getConnection(req);
    const connectionId = getLocalAddr(socket);
    locals.add(connectionId);
    socket.once("close", () => locals.delete(connectionId));
  });
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

export async function isLoopback(id: string): Promise<boolean>;
export async function isLoopback(socket: Socket): Promise<boolean>;
export async function isLoopback(key: Socket | string): Promise<boolean> {
  await Promise.all(connecting);
  return locals.has(typeof key === "string" ? key : getRemoteAddr(key));
}
