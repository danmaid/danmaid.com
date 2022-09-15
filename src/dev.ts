import { DevServer } from './DevServer'

export const server = new DevServer()
server.listen(8521, () => {
  console.log(server.address())
})

process.on('SIGINT', () => server.close())
