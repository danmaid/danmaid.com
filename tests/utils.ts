import { createServer } from 'net'

export function checkListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
    server.on('error', (e: any) => resolve(e.code === 'EADDRINUSE'))
    server.on('listening', () => server.close(() => resolve(false)))
    server.listen(port)
  })
}
