import express from 'express'
import cors from 'cors'
import { addEvent, Cache, Event, filterEvents } from './Event'
import { QueryFilter, QueryParams } from './QueryFilter'

import { EventEmitter, on } from 'node:events'

const origin = [
  'chrome-extension://ibndfaodijdaghpfgfomkbccnpablmki',
  'chrome-extension://hmamcnlhilpmomdgjkmeghcfcddgdkop',
]

const eventCache = new Cache<Event>()
async function load() {
  for await (const e of filterEvents((v) => v.method !== 'GET' && v.method !== 'HEAD')) {
    eventCache.add(e)
  }
}

const ee = new EventEmitter()

const app = express()
app.use(cors({ origin }))
app.use(express.json())
app.use(async (req, res, next) => {
  const { method, path, headers, ip, ips, body } = req
  const event = new Event({ ...headers, ip, ips, method, path, body })
  await addEvent(event)
  if (method !== 'GET' && method !== 'HEAD') eventCache.add(event)
  ee.emit('event', event)
  next()
})
app.post('*', (req, res) => res.sendStatus(202))
app.get('*', async (req, res, next) => {
  if (!req.accepts().includes('text/event-stream')) return next()
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'text/event-stream')
  res.flushHeaders()
  const ac = new AbortController()
  res.once('close', () => ac.abort())
  for await (const ev of on(ee, 'event', { signal: ac.signal })) {
    res.write(`data: ${JSON.stringify(ev)}\n`)
    res.write(`id: ${ev.id}\n\n`)
  }
})
app.get<null, unknown[], null, QueryParams>('*', async (req, res) => {
  const q = new QueryFilter(req.query)
  const data = q.exec(Array.from(eventCache))
  res.json(data)
})

async function start(port?: number): Promise<void> {
  await new Promise<void>((r) => app.listen(port, r))
}
