// @ts-ignore
const sw = self as ServiceWorkerGlobalScope & Window & typeof globalThis

class XXXStream extends TransformStream {
  constructor() {
    super({ transform(chunk, controller) {} })
  }
}
async function xxx(ev: FetchEvent): Promise<Response> {
  const res = await fetch(ev.request)
  res.body?.pipeThrough(new TextDecoderStream()).pipeThrough(new TransformStream({ transform(chunk, controller) {} }))
  return new Response(res.body?.pipeThrough(new TextDecoderStream()).pipeThrough(new XXXStream()), res)
}

sw.addEventListener('fetch', (ev) => {
  if (!/rfc6749.spec.js$/.test(ev.request.url)) return
  console.log('steel', ev)
  ev.respondWith(xxx(ev))
})

sw.addEventListener('install', (ev) => {
  console.log('sw installed.')
})
