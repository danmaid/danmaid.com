import http from 'node:http'
import express from 'express'
import { todos } from './todos'
import { sensors } from './sensors'
import { sse } from './sse'

export class Server extends http.Server {
  constructor(public app = express()) {
    super(app)
    app.use(sse)
    app.use(todos)
    app.use(sensors)
  }
}
