import { Router, json } from 'express'
import { EventEmitter, on } from 'node:events'

const ee = new EventEmitter()

export const middleware = Router()
  .get('*', async (req, res, next) => {
    if (!req.accepts().includes('text/event-stream')) return next()
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Type', 'text/event-stream')
    const ac = new AbortController()
    res.once('close', () => {
      ac.abort()
      console.log('SSE closed.', req.socket.remoteAddress, req.socket.remotePort)
    })
    res.flushHeaders()
    console.log('SSE started.', req.socket.remoteAddress, req.socket.remotePort)
    try {
      for await (const [data] of on(ee, 'event', { signal: ac.signal })) {
        res.write(`data: ${JSON.stringify(data)}\n\n`)
        console.log(`sent. ${req.socket.remoteAddress}:${req.socket.remotePort}`)
      }
    } catch {}
  })
  .use(json())
  .post('*', async (req, res) => {
    ee.emit('event', req.body)
    res.sendStatus(200)
  })

export default () => middleware
