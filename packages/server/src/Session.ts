import { IncomingMessage, ServerResponse } from "node:http";
import { EventEmitter } from "node:events";
import { Manageable } from "./Manager";

export class Session extends EventEmitter implements Manageable {
  status?: number;
  reason?: string;

  constructor(public req: IncomingMessage, public res: ServerResponse) {
    super();
    res.on("finish", () => {
      if (res.headersSent) {
        this.status = res.statusCode;
        this.reason = res.statusMessage;
      }
      this.emit("updated");
    });
    Promise.all([
      new Promise((r) => req.on("close", r)),
      new Promise((r) => res.on("close", r)),
    ]).then(() => this.emit("deleted"));
  }

  toJSON() {
    return {
      method: this.req.method,
      url: this.req.url,
      version: this.req.httpVersion,
      connection: this.req.socket,
      status: this.status,
      reason: this.reason,
    };
  }

  delete(): void {
    this.res.destroy();
  }
}
