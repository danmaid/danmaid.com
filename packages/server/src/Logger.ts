import { Console } from "node:console";
import { PassThrough, Writable } from "node:stream";
import { format } from "node:util";
import WebSocket, { createWebSocketStream } from "ws";

export function createLogWriter(
  out: Writable
): Console["log"] & { stream: PassThrough; connect(url: string): void } {
  const stream = new PassThrough();
  stream.pipe(out);
  const ws = new PassThrough();
  stream.pipe(ws);

  const writer = (...args: Parameters<Console["log"]>) => {
    stream.push(new Date().toISOString() + " " + format(...args) + "\n");
  };
  writer.stream = new PassThrough();
  writer.connect = (url: string) => {
    ws.pipe(createWebSocketStream(new WebSocket(url.replace(/^http/, "ws"))));
  };
  return writer;
}

export type Connectable = keyof Pick<
  Logger,
  "log" | "debug" | "info" | "warn" | "error"
>;
export class Logger extends Console {
  log = createLogWriter(process.stdout);
  debug = createLogWriter(process.stdout);
  info = createLogWriter(process.stdout);
  warn = createLogWriter(process.stderr);
  error = createLogWriter(process.stderr);

  constructor() {
    super(process.stdout);
  }

  destroy() {
    this.log.stream.end();
    this.debug.stream.end();
    this.info.stream.end();
    this.warn.stream.end();
    this.error.stream.end();
  }
}
