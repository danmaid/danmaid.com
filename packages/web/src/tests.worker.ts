// @ts-ignore
const sw = self as ServiceWorkerGlobalScope & Window & typeof globalThis

async function xxx(ev: FetchEvent): Promise<Response> {
  const res = await fetch(ev.request)
  const body = await res.text()
  const replaced = body.replaceAll("from '@playwright/test'", "from './dm-test.js'")
  const headers = new Headers(res.headers)
  headers.set('Content-Length', replaced.length.toString())
  return new Response(replaced, { ...res, headers })
}

sw.addEventListener('fetch', (ev) => {
  if (!/rfc6749.spec.js$/.test(ev.request.url)) return
  console.log('steel', ev)
  ev.respondWith(xxx(ev))
})

sw.addEventListener('install', (ev) => {
  console.log('sw installed.')
})
