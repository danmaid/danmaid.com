import http from 'node:http'
import express from 'express'
import { todos } from './todos'
import { sensors } from './sensors'

export class Server extends http.Server {
  constructor(public app = express()) {
    super(app)
    app.use(todos)
    app.use(sensors)
  }
}
