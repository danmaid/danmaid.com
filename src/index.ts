import { createServer } from 'http'
import WebSocket from 'ws'

export const server = createServer()
export const wss = new WebSocket.Server({ server })

server.on('request', async (req, res) => {
  const body = await new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => resolve(data))
  })
  wss.clients.forEach((ws) => ws.send(body))
  res.writeHead(200).end()
})
