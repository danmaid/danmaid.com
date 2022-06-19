import { createServer } from 'http'
import WebSocket from 'ws'

export const server = createServer()
export const wss = new WebSocket.Server({ server })
export const events: unknown[] = []

server.on('request', async (req, res) => {
  const body: string = await new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => resolve(data))
  })
  if (req.method === 'PUT') {
    events.push(JSON.parse(body))
    wss.clients.forEach((ws) => ws.send(body))
    return res.writeHead(200).end()
  }
  if (req.method === 'GET') {
    return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(events))
  }
})
