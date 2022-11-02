import { RequestHandler } from 'express'
import { EventListener, events } from './events'

export const sse: RequestHandler = (req, res, next) => {
  if (!req.accepts().includes('text/event-stream')) return next()
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'text/event-stream')
  res.flushHeaders()
  const listener: EventListener = (ev) => {
    res.write(`id: ${ev.id}\n`)
    res.write(`data: ${JSON.stringify(ev)}\n\n`)
  }
  events.on('added', listener)
  res.on('close', () => events.off('added', listener))
}
