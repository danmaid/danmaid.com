import { join, dirname, basename } from "https://deno.land/std@0.212.0/path/mod.ts"

Deno.mkdirSync('./data', { recursive: true })

const events = new class SSE {
  dispatchEvent(event: MessageEvent): boolean {
    const data = new TextEncoder().encode(`event: ${event.type}\ndata: ${event.data}\n\n`)
    for (const controller of this.clients) {
      try {
        controller.enqueue(data)
      } catch (err) {
        console.warn('client failed.', err)
        this.clients.delete(controller)
      }
    }
    return true
  }

  clients = new Set<ReadableStreamDefaultController>()
  client(): ReadableStream {
    return new ReadableStream({
      start: (controller) => { this.clients.add(controller) }
    })
  }
}

async function readJsonFile(path: string): Promise<ReturnType<JSON['parse']>> {
  const text = await Deno.readTextFile(path)
  return JSON.parse(text)
}

Deno.serve(async (request) => {
  if (request.method === 'GET' && request.headers.get('accept') === 'text/event-stream') {
    return new Response(events.client(), { headers: { 'content-type': 'text/event-stream' } })
  }
  if (request.method === 'PUT') {
    const url = new URL(request.url)
    const path = join('./data', url.pathname)
    await Deno.mkdir(path, { recursive: true })
    if (!request.body) return new Response()
    const buffer = await request.arrayBuffer()
    const hash = await crypto.subtle.digest('SHA-256', buffer)
    const hex = Array.from(new Uint8Array(hash)).map(v => v.toString(16).padStart(2, '0')).join('')
    await Deno.writeFile(join(path, hex), new Uint8Array(buffer))

    const index = await readJsonFile(join(path, '.json')).catch(() => [])
    if (!Array.isArray(index)) throw Error('invalid index.')
    index.push([hex, Object.fromEntries(request.headers.entries())])
    await Deno.writeTextFile(join(path, '.json'), JSON.stringify(index))

    events.dispatchEvent(new MessageEvent('saved', { data: `${url.pathname}/${hex}` }))
    return new Response(null, { headers: { 'content-location': `${url.pathname}/${hex}` } })
  }
  if (request.method === 'GET') {
    const url = new URL(request.url)
    const path = join('./data', url.pathname)
    try {
      const file = await Deno.open(path)
      const index = await readJsonFile(join(dirname(path), '.json')).catch(() => [])
      if (!Array.isArray(index)) throw Error('invalid index.')
      const headers = index.findLast(([v]) => v === basename(path))?.[1]
      return new Response(file.readable, { headers })
    } catch (err) {
      console.warn(err)
    }
    if (url.pathname.endsWith('/')) {
      if (request.headers.get('accept') === 'application/json') {
        const file = await Deno.open(join(path, '.json'))
        return new Response(file.readable, { headers: { 'content-type': 'application/json' } })
      }
      let index = ''
      for await (const ent of Deno.readDir(path)) {
        if (ent.name === '.json') continue
        index += ent.name + '\n'
      }
      return new Response(index, { headers: { 'content-type': 'text/plain' } })
    }

    const index = await readJsonFile(join(path, '.json')).catch(() => [])
    if (!Array.isArray(index)) throw Error('invalid index.')
    const [name, meta] = index.findLast(([, v]) => v['content-type']?.match(request.headers.get('accept')?.replace('*', '.*'))) || ['', {}]
    const file = await Deno.open(join(path, name))
    const headers = new Headers(meta)
    headers.set('content-location', `${url.pathname}/${name}`)
    return new Response(file.readable, { headers })
  }
  const url = new URL(request.url)
  const path = join('./data', url.pathname)
  try {
    await Deno.open(path)
  } catch (err) {
    console.warn(err)
    for await (const ent of Deno.readDir(path)) {
      console.log(ent.name)
    }
    console.log('d')
  }
  return new Response(null, { status: 501 })
})
