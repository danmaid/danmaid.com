import { Server } from '.'
import { program } from 'commander'

program
  .command('start')
  .description('start server')
  .option('-p, --port <number>', 'listen port', (v) => parseInt(v), 8520)
  .action(({ port }) => {
    const server = new Server()
    server.listen(port)
  })

program.parse()
