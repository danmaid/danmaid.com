import { join } from 'https://deno.land/std@0.212.0/path/join.ts';
import { load, save } from './file.ts'

export async function getHeaders(path: string): Promise<Headers> {
  try {
    const meta = await getMeta(path)
    const headers = new Headers(meta)
    const location = headers.get('content-location')
    if (location) {
      const r = await getHeaders(location)
      r.set('content-location', location)
      return r
    }
    for (const [k] of headers) {
      if (!k.startsWith('content-')) headers.delete(k)
    }
    return headers
  } catch {
    return new Headers()
  }
}

export async function negotiation(path: string, accept: string): Promise<Response> {
  const types = accept.split(",")
    .map((v) => {
      const [type, q] = v.split(";q=");
      const quality = q ? parseFloat(q) || 1 : 1;
      return { type: type.trim(), quality };
    })
    .sort((a, b) => b.quality - a.quality)
  for (const { type } of types) {
    const ext = type.replace('*/*', '').replace('/*', '').replace('/', '.')
    const p = ext ? `${path}.${ext}` : path
    try {
      const headers = await getHeaders(p)
      const body = await load(headers.get('content-location') || p)
      return new Response(body, { headers })
    } catch (err) {
      console.log(err)
      continue
    }
  }
  if (path.endsWith('/') && types.some(({ type }) => type === 'application/json')) try {
    const x = new Set<string>()
    const dir = join('./data', path)
    for await (const ent of Deno.readDir(dir)) {
      x.add(ent.name.slice(0, ent.name.indexOf('.')))
    }
    const y = await Promise.all([...x].map(async (id) => {
      try {
        const text = await Deno.readTextFile(join(dir, id + '.application.json'))
        return { ...JSON.parse(text), id }
      } catch (err) {
        console.log(err)
        return { id }
      }
    }))
    return new Response(JSON.stringify(y), { headers: { 'content-type': 'application/json' } })
  } catch (err) {
    console.log(err)
  }
  return new Response(null, { status: 404 })
}

export async function saveByType(path: string, type: string, body: ReadableStream): Promise<Response> {
  const ext = type.split(';', 1)[0].replace('/', '.')
  await save(`${path}.${ext}`, body)
  const meta = new Blob([JSON.stringify({ 'content-type': type })]).stream()
  await save(`${path}.${ext}.application.json`, meta)
  // set content-location if not exists
  const location = { 'content-location': `${path}.${ext}` }
  if (!(await getHeaders(path)).has('content-location')) {
    const meta = await getMeta(path)
      .then((old) => ({ ...old, ...location }))
      .catch(() => location)
    const data = new Blob([JSON.stringify(meta)]).stream()
    await save(path + '.application.json', data)
  }
  return new Response(null, { headers: location })
}

async function getMeta(path: string) {
  const data = await load(path + '.application.json')
    .catch(() => load(path + '.header.json'))
    .catch(() => load(path + '.meta.json'))
    .catch(() => load(path + '.meta'))
  return await new Response(data).json()
}
