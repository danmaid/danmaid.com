import { Console } from "node:console";
import { PassThrough } from "node:stream";
import { format } from "node:util";
import { fetch } from "./client";
import { request } from "node:http";

const manager = process.env.MANAGER;

function createLogWriter(prefix = ""): Console["log"] & {
  connect(): Promise<string>;
  destroy(): void;
} {
  const stream = new PassThrough();
  stream.pipe(process.stdout)
  const writer = (...args: Parameters<Console["log"]>) => {
    stream.push(format(`${prefix}${args.shift()}`, ...args) + "\n");
  };
  const connect = async (): Promise<string> => {
    const res = await fetch(manager + "/logs/", { method: "POST" });
    if (res.statusCode !== 201) throw Error("status code !== 201");
    if (!res.headers.location) throw Error("Location header not found.");
    const url = res.headers.location;
    res.destroy();
    stream.pipe(request(url, { method: "PUT" }));
    console.log("connected", url);
    return url;
  };
  const destroy = () => stream.end();
  return Object.assign(writer, { connect, destroy });
}

export class ManagedLogger extends Console {
  writers = ["log", "debug", "info", "warn", "error"] as const;
  log = createLogWriter(`${new Date().toISOString()} `);
  debug = createLogWriter(`[debug] ${new Date().toISOString()} `);
  info = createLogWriter(`[info] ${new Date().toISOString()} `);
  warn = createLogWriter(`[warn] ${new Date().toISOString()} `);
  error = createLogWriter(`[error] ${new Date().toISOString()} `);

  constructor() {
    super(process.stdout);
  }

  async connect(): Promise<Record<(typeof this.writers)[number], string>> {
    const entries = this.writers.map(async (k) => [k, await this[k].connect()]);
    return Object.fromEntries(await Promise.all(entries));
  }

  destroy(): void {
    this.writers.forEach((k) => this[k].destroy());
  }
}
