import { createServer } from 'vite'
import express from 'express'
import morgan from 'morgan'
import { EventEmitter, on } from 'node:events'
import { randomUUID } from 'node:crypto'

const ee = new EventEmitter()
setInterval(() => {
  const event = { id: randomUUID(), date: new Date() }
  ee.emit('event', event)
  process.stdout.write(`\remitted. ${JSON.stringify(event)}`)
}, 1000)

const app = express()
app.use(morgan('dev'))

app.get('/', async (req, res, next) => {
  if (!req.accepts().includes('text/event-stream')) return next()
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'text/event-stream')
  const ac = new AbortController()
  res.once('close', () => {
    ac.abort()
    console.log('\nSSE closed.', req.socket.remoteAddress, req.socket.remotePort)
  })
  res.flushHeaders()
  console.log('\nSSE started.', req.socket.remoteAddress, req.socket.remotePort)
  try {
    for await (const [data] of on(ee, 'event', { signal: ac.signal })) {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
      process.stdout.write(` sent. ${req.socket.remoteAddress}:${req.socket.remotePort}`)
    }
  } catch {}
})

const vite = await createServer({ server: { middlewareMode: true } })
app.use(vite.middlewares)

app.listen(3000, () => console.log('http://localhost:3000'))
