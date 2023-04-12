import express from 'express'
import morgan from 'morgan'
import middleware from './middleware.js'
import { Socket } from 'node:net'

const app = express()
app.use(morgan('combined'))
app.use(middleware())
app.use(express.static('dist'))

const server = app.listen(3000, () => console.log('http://localhost:3000'))
const connections = new Set<Socket>()
server.on('connection', (socket) => {
  connections.add(socket)
  socket.once('close', () => connections.delete(socket))
})

function close() {
  for (const conn of connections) conn.destroy()
  server.close()
}

process.on('SIGTERM', () => close())
process.on('SIGINT', () => close())
