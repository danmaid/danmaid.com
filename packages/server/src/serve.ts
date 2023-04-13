import express from 'express'
import morgan from 'morgan'
import { EventEmitter } from 'node:events'
import { SSE } from './SSE'
import { WSS } from './WSS'
import { Server } from 'node:http'
import { ConnectionManager } from './ConnectionManager'

const ee = new EventEmitter()

const app = express()
app.use(morgan('combined'))

const server = new Server(app)
const cm = new ConnectionManager({ server })

const sse = new SSE()
app.use(sse.middleware)
ee.on('event', (data) => sse.broadcast(data))

const wss = new WSS({ server })
ee.on('event', (data) => wss.broadcast(data))

app.use(express.static('public'))
app.use(express.json())
app.post('/', (req, res) => {
  if (!req.body) return res.sendStatus(202)
  ee.emit('event', JSON.stringify(req.body))
  res.sendStatus(200)
})

function close() {
  cm.close()
  server.close()
}

process.on('SIGTERM', () => close())
process.on('SIGINT', () => close())

server.listen(3000, () => console.log('http://localhost:3000'))
