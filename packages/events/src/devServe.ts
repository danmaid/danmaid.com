import { createServer } from 'vite'
import express from 'express'
import morgan from 'morgan'
import middleware from './middleware'
import { randomUUID } from 'node:crypto'
import { request } from 'node:http'

const app = express()
app.use(morgan('dev'))
app.use(middleware())

const vite = await createServer({ server: { middlewareMode: true } })
app.use(vite.middlewares)

app.listen(3000, () => {
  console.log('http://localhost:3000')

  setInterval(async () => {
    const event = { id: randomUUID(), date: new Date() }
    const req = request('http://localhost:3000', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
    const payload = JSON.stringify(event)
    req.write(payload)
    await new Promise((r) => req.end(r))
    console.log(`emitted. ${payload}`)
  }, 5000)
})
