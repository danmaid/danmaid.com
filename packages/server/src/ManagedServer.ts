import { Server } from "node:http";
import { Manager } from "./Manager";
import { Connection } from "./Connection";
import { Session } from "./Session";
import { isLoopbackRequest, isLoopbackSocket } from "./client";

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

  emit(event: string, ...args: any[]): boolean {
    if (event === "connection" && !isLoopbackSocket(args[0])) {
      this.manager
        .add(new Connection(args[0]), "/connections/")
        .then(() => super.emit(event, ...args));
      return !!this.listenerCount(event);
    }
    if (event === "request" && !isLoopbackRequest(args[0])) {
      this.manager
        .add(new Session(args[0], args[1]), "/sessions/")
        .then(() => super.emit(event, ...args));
      return !!this.listenerCount(event);
    }
    return super.emit(event, ...args);
  }
}
