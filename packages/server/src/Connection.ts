import { Socket } from "node:net";
import { EventEmitter } from "node:events";
import { Manageable } from "./Manager";

export class Connection extends EventEmitter implements Manageable {
  constructor(readonly socket: Socket) {
    super();
    socket.on("close", (hadError) => this.emit("deleted", hadError));
    Object.assign(socket, {
      toString: () => this.toString(),
      toJSON: (key: string) => this.toJSON(key),
    });
  }

  toJSON(key = "") {
    return {
      family: this.socket.remoteFamily,
      address: this.socket.remoteAddress,
      port: this.socket.remotePort,
    };
  }

  delete(): void {
    this.socket.destroy();
  }
}
