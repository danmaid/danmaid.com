import { Server, ServerOptions, RequestListener } from "node:http";
import type { Socket } from "node:net";
import type { IncomingMessage, ServerResponse } from "node:http";
import WebSocket, { Server as WSS } from "ws";
import { fetch, isLoopback } from "./client";
import { registerItem } from "./maid";
import { SSE } from "./SSEx";
import { createLogWriter } from "./Logger";
import { ListenOptions } from "net";
import { Duplex } from "stream";
import { randomUUID } from "node:crypto";

// prettier-ignore
export interface ManagedServer {
  on(event: "close", listener: () => void): this;
  on(event: "connection", listener: (socket: Socket) => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  on(event: "listening", listener: () => void): this;
  on(event: "checkContinue", listener: RequestListener<typeof IncomingMessage, typeof ServerResponse>): this;
  on(event: "checkExpectation", listener: RequestListener<typeof IncomingMessage, typeof ServerResponse>): this;
  on(event: "clientError", listener: (err: Error, socket: Duplex) => void): this;
  on(event: "connect", listener: (req: IncomingMessage, socket: Duplex, head: Buffer) => void): this;
  on(event: "dropRequest", listener: (req: IncomingMessage, socket: Duplex) => void): this;
  on(event: "request", listener: RequestListener<typeof IncomingMessage, typeof ServerResponse>): this;
  on(event: "upgrade", listener: (req: IncomingMessage, socket: Duplex, head: Buffer) => void): this;
  on(event: "websocket", listener: (ws: WebSocket, req: Request) => void): this;
  on(event: "sse", listener: RequestListener): this;
  on(event: string, listener: (...args: any[]) => void): this;

  listen(port?: number | undefined, hostname?: string | undefined, backlog?: number | undefined, listeningListener?: (() => void) | undefined): this;
  listen(port?: number | undefined, hostname?: string | undefined, listeningListener?: (() => void) | undefined): this;
  listen(port?: number | undefined, backlog?: number | undefined, listeningListener?: (() => void) | undefined): this;
  listen(port?: number | undefined, listeningListener?: (() => void) | undefined): this;
  listen(path: string, backlog?: number | undefined, listeningListener?: (() => void) | undefined): this;
  listen(path: string, listeningListener?: (() => void) | undefined): this;
  listen(options: ListenOptions, listeningListener?: (() => void) | undefined): this;
  listen(handle: any, backlog?: number | undefined, listeningListener?: (() => void) | undefined): this;
  listen(handle: any, listeningListener?: (() => void) | undefined): this;

  emit(event: "close"): boolean;
  emit(event: "connection", socket: Socket): boolean;
  emit(event: "error", err: Error): boolean;
  emit(event: "listening"): boolean;
  emit(event: "checkContinue", req: IncomingMessage, res: ServerResponse<IncomingMessage> & { req: IncomingMessage; }): boolean;
  emit(event: "checkExpectation", req: IncomingMessage, res: ServerResponse<IncomingMessage> & { req: IncomingMessage; }): boolean;
  emit(event: "clientError", err: Error, socket: Duplex): boolean;
  emit(event: "connect", req: IncomingMessage, socket: Duplex, head: Buffer): boolean;
  emit(event: "dropRequest", req: IncomingMessage, socket: Duplex): boolean;
  emit(event: "request", req: IncomingMessage, res: ServerResponse<IncomingMessage> & { req: IncomingMessage; }): boolean;
  emit(event: "upgrade", req: IncomingMessage, socket: Duplex, head: Buffer): boolean;
  emit(event: string, ...args: any[]): boolean;
}

/**
 * construct => manage(this) => POST manager/servers
 *   - access =>
 *   - error => POST manager/logs
 * onconnection => manage(socket) => POST manager/connections
 * onsession => manage(req, res) => POST manager/sessions
 * onaccess => POST manager/logs => WebSocket Location
 * onerror => POST manager/logs => WebSocket Location
 * GET /connections => string[]
 * GET /sessions => string[]
 * DELETE /connections/:id => socket.destroy()
 * DELETE /sessions/:id => res.destroy()
 */
export class ManagedServer extends Server {
  manager?: string = process.env.MANAGER;
  managed = new Map<
    "access" | "error" | this | Socket | IncomingMessage,
    Promise<string>
  >();
  logger = {
    access: createLogWriter(process.stdout),
    error: createLogWriter(process.stderr),
  };
  wss: WSS = new WSS({ server: this });
  sse = new SSE();

  constructor(requestListener?: RequestListener);
  constructor(options: ServerOptions, requestListener?: RequestListener);
  constructor(...args: any[]) {
    super(...args);
    if (this.manager) this.connect();
    else this.once("listening", () => this.connectSelf());
    this.on("sse", this.onsse);
    this.on("connection", async (socket) => {
      Object.assign(socket, {
        toString(this: typeof socket) {
          return `[connection ${this.remoteFamily} ${this.remoteAddress} ${this.remotePort}]`;
        },
      });
      this.logger.access(`[open] ${socket}`);
      const hadError = await new Promise((r) => socket.on("close", r));
      this.logger.access(`[close] ${socket}`, hadError);
    });
    this.on("request", async (req, res) => {
      Object.assign(req, {
        toString(this: typeof req) {
          return `[request ${this.method} ${this.url} ${this.httpVersion}] ${this.socket}`;
        },
      });
      Object.assign(res, {
        toString(this: typeof res) {
          return `[response ${this.statusCode} ${this.statusMessage}] ${this.socket}`;
        },
      });
      this.logger.access(`[open] ${req}`);
      this.logger.access(`[open] ${res}`);
      const closeReq = new Promise((r) => req.on("close", r));
      const closeRes = new Promise((r) => res.on("close", r));
      closeReq.then(() => this.logger.access(`[close] ${req}`));
      closeRes.then(() => this.logger.access(`[close] ${res}`));

      const session = { req, res };
      Object.assign(session, {
        toString(this: typeof session) {
          return `[session ${this.req} ${this.res}]`;
        },
      });
      this.logger.access(`[open] ${session}`);
      await Promise.all([closeReq, closeRes]);
      this.logger.access(`[close] ${session}`);
    });
    this.on("request", async (req, res) => {
      this.logger.access(`[${req.method}]`, req.url);
      if (!req.url) return console.error("invalid url", req.url);
      const url = new URL(req.url, `http://${req.headers.host}`);
      // POST /servers
      // POST /logs
      // POST /connections
      // POST /sessions
      if (req.method === "POST") {
        const id = randomUUID();
        url.pathname += url.pathname.endsWith("/") ? id : `/${id}`;
        res.setHeader("Location", url.href);
        res.statusCode = 201;
        return res.end();
      }
      // GET /connections
      // GET /sessions
      if (req.method === "GET") {
        const prefix = new RegExp(`^${url.href}/?([^/]+)`);
        const ids = Array.from(
          await Array.from(this.managed.values()).reduce(async (a, v) => {
            const matched = (await v).match(prefix);
            return matched ? (await a).add(matched[1]) : a;
          }, Promise.resolve(new Set<string>()))
        );
        if (ids.length < 1) {
          res.statusCode = 404;
          return res.end();
        }
        const body = JSON.stringify(ids);
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 200;
        res.write(body);
        return res.end();
      }
      // DELETE /connections/:id
      // DELETE /sessions/:id
    });
    this.wss.on("connection", (ws, req) => {
      this.logger.access("[WebSocket]", req.url, ws.protocol);
      this.emit("websocket", ws, req);
    });

    // this.prependListener("request", this.onsession);
    // this.prependListener("request", async (req, res) => {
    //   const requestDate = new Date();
    //   await new Promise((r) => res.on("close", () => r(new Date())));
    //   const h = req.socket.remoteAddress || "-";
    //   const t = requestDate.toISOString();
    //   const r = `${req.method} ${req.url} ${req.httpVersion}`;
    //   const s = res.statusCode;
    //   this.logger.access(`${h} ${t} "${r}" ${s}`);
    // });
  }

  connectSelf() {
    const addr = this.address();
    if (!addr || typeof addr === "string") throw Error("unsupport manager");
    this.manager = `http://localhost:${addr.port}`;
    this.connect();
  }

  async connect(manager = this.manager): Promise<string> {
    if (!manager) throw Error("unsupport manager");
    this.manager = manager;

    const access = registerItem(manager + "/logs");
    this.managed.set("access", access);
    this.logger.access.connect(await access);

    const error = registerItem(manager + "/logs");
    this.managed.set("error", error);
    this.logger.error.connect(await error);

    const server = registerItem(manager + "/servers", { access, error });
    this.managed.set(this, server);
    return await server;
  }

  emit(event: string, ...args: any[]): boolean {
    if (event !== "request") return super.emit(event, ...args);
    if (SSE.isSSE(args[0])) return super.emit("sse", ...args);
    return super.emit(event, ...args);
  }

  onsse: RequestListener = (req, res) => {
    this.sse.connect(req, res);
    res.on("close", () => this.logger.access("SSE closed."));
    this.logger.access("SSE connected.");
  };

  // onsession: RequestListener = (req, res) => {
  //   const manage = this.manageSession(req);
  //   this.managed.set(req, manage);
  //   manage.catch((err) => {
  //     console.warn("manage failed.", err);
  //     this.managed.delete(req);
  //   });
  // };

  // async manageSession(req: IncomingMessage): Promise<string> {
  //   console.debug(">>manageSession");
  //   const id = req.headers["request-id"];
  //   if (typeof id === "string" && (await isLoopback(id)))
  //     throw Error("ignore loopback.");
  //   req.on("close", async () => {
  //     const url = await added;
  //     console.log(">>closeSession", url);
  //     const res = await fetch(url, { method: "DELETE" });
  //     if (res.statusCode !== 200) throw Error("status code !== 200");
  //   });
  //   const added = registerItem(`http://${host}/sessions`, {
  //     method: req.method,
  //     url: req.url,
  //     version: req.httpVersion,
  //     headers: req.headers,
  //     connection: await this.managed.get(req.socket),
  //     server: await this.managed.get(this),
  //   });
  //   console.debug("<<manageSession");
  //   return added;
  // }
}
