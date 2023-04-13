import { Server } from 'node:http'
import { Socket } from 'node:net'

export class ConnectionManager {
  connections = new Set<Socket>()

  constructor(options: { server: Server }) {
    options.server.on('connection', (socket) => this.onconnect(socket))
  }

  onconnect: (socket: Socket) => void = (socket) => {
    socket.on('close', () => this.ondisconnect(socket))
    this.connections.add(socket)
  }
  ondisconnect: (socket: Socket) => void = (socket) => {
    this.connections.delete(socket)
  }

  close() {
    for (const conn of this.connections) conn.destroy()
  }
}
