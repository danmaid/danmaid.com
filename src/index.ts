import { Server } from './Server'

export const server = new Server()
server.listen(8520, () => {
  console.log(server.address())
})
