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
    if (blueprint) app.use(express.static('packages/blueprint/public'))
    const server = new Server(app)
    server.listen(port)
  })

program.parse()
