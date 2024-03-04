import { dirname } from "https://deno.land/std@0.212.0/path/dirname.ts";
import { join } from "https://deno.land/std@0.212.0/path/join.ts";

export function filter(ev: Event): boolean {
  if (ev.type !== 'request') return false
  if (!('request' in ev) || !ev.request || typeof ev.request !== 'object') return false
  if (!('method' in ev.request) || (ev.request.method !== 'PUT' && ev.request.method !== 'DELETE')) return false
  if (!('url' in ev.request) || typeof ev.request.url !== 'string') return false
  return true
}

export function listener(ev: RequestEvent): void {
  const { url, body, method } = ev.request
  const path = decodeURIComponent(new URL(url).pathname)
  if (method === 'PUT' && body) return ev.respondWith(save(path, body))
  if (method === 'DELETE') return ev.respondWith(remove(path))
}

async function save(path: string, data: ReadableStream): Promise<Response> {
  const filepath = join('./data', path);
  await Deno.mkdir(dirname(filepath), { recursive: true })
  const file = await Deno.open(filepath, { write: true, truncate: true, create: true })
  await data.pipeTo(file.writable)
  dispatchEvent(new Event('stored'))
  return new Response()
}

async function remove(path: string): Promise<Response> {
  const filepath = join('./data', path);
  await Deno.remove(filepath)
  dispatchEvent(new Event('removed'))
  return new Response()
}

interface RequestEvent extends Event {
  readonly request: Request
  respondWith(response: Response | Promise<Response>): void
}


declare global {
  interface WindowEventMap {
    stored: Event
    removed: Event
  }
}
