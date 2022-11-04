import http from 'node:http'
import express from 'express'
import { todos } from './todos'
import { sensors } from './sensors'
import { sse } from './sse'
import { events } from './events'
import { schedules } from './schedules'

export class Server extends http.Server {
  constructor(public app = express()) {
    super(app)
    app.use(sse)
    app.use(todos)
    app.use(sensors)
    app.use(schedules)
    app.use(express.json())
    app.post('*', async ({ body }, res) => {
      const id = await events.add(body)
      res.status(201).json(id)
    })
  }
}
