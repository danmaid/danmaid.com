import { Server, IncomingMessage } from "node:http";
import { ManagedLogger } from "./ManagedLogger";
import { Manager } from "./Manager";
import { Connection } from "./Connection";
import { Session } from "./Session";
import { isLoopback } from "./client";
import { Socket } from "node:net";

export const console = new ManagedLogger();

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
  manager = new Manager(process.env.MANAGER || "");

  constructor(...args: any[]) {
    super(...args);
    console.connect();
  }

  emit(event: string, ...args: any[]): boolean {
    if (event === "connection") {
      isLoopback(args[0]).then((v) => {
        if (v) return super.emit(event, ...args);
        this.manager
          .add(new Connection(args[0]), "/connections/")
          .then(() => super.emit(event, ...args));
      });
      return !!this.listenerCount(event);
    }
    if (event === "request") {
      isLoopback(args[0]).then((v) => {
        if (v) return super.emit(event, ...args);
        this.manager
          .add(new Session(args[0], args[1]), "/sessions/")
          .then(() => super.emit(event, ...args));
      });
      return !!this.listenerCount(event);
    }
    return super.emit(event, ...args);
  }
}
