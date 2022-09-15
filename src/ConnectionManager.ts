import { Server, Socket } from 'node:net'
import { debuglog } from 'node:util'

const console = { log: debuglog('cm') }

export class ConnectionManager {
  connections = new Set<Socket>()

  constructor(server: Server) {
    server.on('connection', (socket) => this.onconnection(socket))
    server.on('close', () => this.destroy())
    console.log('initialized.')
  }

  onconnection(socket: Socket) {
    this.connections.add(socket)
    socket.on('close', () => this.connections.delete(socket))
  }

  destroy() {
    console.log('connections.', this.connections.size)
    this.connections.forEach((v) => v.destroy())
    console.log('destroyed.')
  }
}
