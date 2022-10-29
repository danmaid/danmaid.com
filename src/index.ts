import http from 'node:http'
import express from 'express'
import { todos } from './todos'

export class Server extends http.Server {
  constructor(public app = express()) {
    super(app)
    app.use(todos)
  }
}
