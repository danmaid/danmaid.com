import { Server } from '.'
import { program } from 'commander'
import morgan from 'morgan'
import express from 'express'
import EventSource from 'eventsource'
import { events } from './events'

program
  .command('start')
  .description('start server')
  .option('-p, --port <number>', 'listen port', (v) => parseInt(v), 8520)
  .option('--web')
  .option('--event-proxy')
  .action(({ port, web, eventProxy }) => {
    const app = express()
    app.use(morgan('combined'))
    if (eventProxy) {
      const proxy = new EventSource('https://labo.danmaid.com')
      proxy.onmessage = (ev) => {
        try {
          const event = JSON.parse(ev.data)
          events.add(event.event)
        } catch (e) {
          console.error('proxy failed.', e)
        }
      }
      proxy.onopen = () => console.log('event proxy started.')
    }
    if (web) {
      const serve = express.static('packages/web/public')
      app.use((req, res, next) => {
        if (req.accepts().includes('text/event-stream')) next()
        else serve(req, res, next)
      })
    }
    const server = new Server(app)
    server.listen(port)
  })

program.parse()
