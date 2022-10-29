import { createServer, Server } from 'net'
import { AddressInfo } from 'node:net'

export function checkListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
    server.on('error', (e: any) => resolve(e.code === 'EADDRINUSE'))
    server.on('listening', () => server.close(() => resolve(false)))
    server.listen(port)
  })
}

export function getUrl(addr: AddressInfo | string | null): string {
  if (!addr) return ''
  if (typeof addr === 'string') return addr
  const { address, family, port } = addr
  const host = family.includes('6') ? `[${address}]` : address
  return `http://${host}:${port}`
}

export function startServer(server: Server): void {
  beforeAll(async () => await new Promise((r) => server.listen(r)))
  afterAll(async () => await new Promise((r) => server.close(r)))
  it('server listening', async () => {
    expect(server.listening).toBe(true)
  })
}
