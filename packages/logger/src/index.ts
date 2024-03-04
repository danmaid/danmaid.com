import { Console, ConsoleConstructorOptions } from "node:console";
import http2 from "node:http2";
import { format } from "node:util";
import crypto from "node:crypto";

const ids = new Map<string, string>();
function getId(key: string): string {
  const exists = ids.get(key);
  if (exists) return exists;
  const gen = crypto.randomUUID();
  ids.set(key, gen);
  return gen;
}

const connections = new Set<http2.ClientHttp2Session>();
const streams = new Map<string, http2.ClientHttp2Stream>();
function getStream(key: string): http2.ClientHttp2Stream {
  const exists = streams.get(key);
  if (exists) return exists;
  const client = http2.connect("https://localhost", {
    rejectUnauthorized: false,
  });
  connections.add(client);
  const req = client.request({
    [http2.constants.HTTP2_HEADER_METHOD]: http2.constants.HTTP2_METHOD_PUT,
    [http2.constants.HTTP2_HEADER_PATH]: "/" + getId(key),
  });
  streams.set(key, req);
  return req;
}

export class Logger extends Console {
  constructor(options?: Partial<ConsoleConstructorOptions>) {
    super({ stderr: process.stderr, stdout: process.stdout, ...options });
  }

  log(message?: any, ...optionalParams: any[]): void {
    super.log(message, ...optionalParams);
    const stream = getStream("log");
    const string = format(message, ...optionalParams);
    stream.write(string);
  }

  async close() {
    await new Promise<void>((r) => setTimeout(r, 100));
    streams.forEach((v) => v.close());
    connections.forEach((v) => v.close());
  }
}

export default new Logger();
