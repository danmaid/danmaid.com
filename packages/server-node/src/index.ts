import { createSecureServer } from 'node:http2'
import { handler } from './handler'
import { config } from './config'

const server = createSecureServer({ allowHTTP1: true }, handler)
server.on('error', (...args) => console.log('error', ...args))
server.on('stream', (stream, headers) => {
  console.log('open', stream.id, headers)
  stream.on('close', () => console.log('close', stream.id, stream.sentHeaders))
})
server.on('close', () => console.log('closed.'))
server.on('listening', () => console.log('listening', server.address()))

config.addEventListener('change', () => {
  console.log('config change.', config)
  const { key, cert, port, listen } = config
  if (server.listening) server.close()
  server.setSecureContext({ key, cert })
  if (listen) server.listen(port)
})
