import { Server } from '.'
import { program } from 'commander'
import morgan from 'morgan'
import express from 'express'

program
  .command('start')
  .description('start server')
  .option('-p, --port <number>', 'listen port', (v) => parseInt(v), 8520)
  .option('--blueprint')
  .action(({ port, blueprint }) => {
    const app = express()
    app.use(morgan('combined'))
    if (blueprint) {
      const serve = express.static('packages/blueprint/public')
      app.use((req, res, next) => {
        if (req.accepts().includes('text/event-stream')) next()
        else serve(req, res, next)
      })
    }
    const server = new Server(app)
    server.listen(port)
  })

program.parse()
