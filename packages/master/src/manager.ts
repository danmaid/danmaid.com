import { Slave, Response } from './Slave'
import { open } from 'node:fs/promises'

const slave = new Slave()
slave.addEventListener('request', async (ev) => {
  if (ev.request.method === 'GET' &&
    new URL(ev.request.url).pathname.startsWith('/manager') &&
    ev.request.headers.get('accept')?.includes('text/html')) {
    return ev.respondWith(GET())
  }
})

async function GET(): Promise<Response> {
  console.log('GET')
  const file = await open('public/manager.html')
  const stat = await file.stat()
  if (!stat.isFile()) throw Error('not found.')
  const stream = file.createReadStream()
  return new Response(stream, { headers: { 'content-type': 'text/html; charset=UTF-8' } })
}
