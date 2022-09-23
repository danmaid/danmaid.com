import { Router, Response } from 'express'
import { Core } from './Core'

export default function (core: Core): Router {
  const connections = new Set<Response>()

  core.on(
    () => true,
    (data) => {
      connections.forEach((res) => {
        if (!res.headersSent) return
        res.write(`data: ${JSON.stringify(data)}\n\n`)
      })
    }
  )

  return Router().get('*', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Type', 'text/event-stream')
    res.flushHeaders()
    connections.add(res)
    res.on('close', () => connections.delete(res))
  })
}
