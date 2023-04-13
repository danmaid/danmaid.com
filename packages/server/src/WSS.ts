import { Server } from 'ws'

export class WSS extends Server {
  broadcast(data: string) {
    console.log(`broadcast.`, data)
    for (const client of this.clients) {
      client.send(data)
      console.log(`sent.`, client)
    }
  }
}
