import { Console } from "node:console";
import { PassThrough } from "node:stream";
import { format } from "node:util";
import { createItem } from "./danmaid";
import { request } from "./client";

class LogStream extends PassThrough {
  constructor() {
    super();
    this.on("disconnected", () => this.connect());
    this.connect();
  }

  async connect() {
    try {
      const { url } = await createItem("/logs/");
      const req = request(url, { method: "PUT" });
      this.pipe(req);
      req.on("close", () => {
        this.unpipe(req);
        this.emit("disconnected");
      });
      this.emit("connected");
    } catch (err) {
      console.error("LogStream connect error.", err);
    }
  }
}

function createStreamWriter(prefix = "") {
  const stream = new PassThrough();
  const remote = new LogStream();
  stream.pipe(remote);
  const writer = (...args: Parameters<Console["log"]>) => {
    stream.push(format(`${prefix}${args.shift()}`, ...args) + "\n");
  };
  return Object.assign(writer, { stream });
}

class Logger extends Console {
  log = createStreamWriter(`${new Date().toISOString()} `);
  debug = createStreamWriter(`[debug] ${new Date().toISOString()} `);
  info = createStreamWriter(`[info] ${new Date().toISOString()} `);
  warn = createStreamWriter(`[warn] ${new Date().toISOString()} `);
  error = createStreamWriter(`[error] ${new Date().toISOString()} `);

  constructor() {
    super(process.stdout);
    this.log.stream.pipe(process.stdout);
    this.debug.stream.pipe(process.stdout);
    this.info.stream.pipe(process.stdout);
    this.warn.stream.pipe(process.stderr);
    this.error.stream.pipe(process.stderr);
  }
}

export const console = new Logger();
