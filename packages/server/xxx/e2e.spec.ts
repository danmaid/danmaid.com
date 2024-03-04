import { expect } from "https://deno.land/std@0.210.0/expect/expect.ts";

declare global {
  var it: any
  var expect: any
  var describe: any
}
globalThis.it = Deno.test
globalThis.expect = expect
globalThis.describe = (title: string, fn: () => void) => fn()


addEventListener('unhandledrejection', (ev) => {
  console.warn(ev.reason)
  ev.preventDefault()
})

import('./serve.ts')
const { close } = await import('./sse.ts')

globalThis.EventSource = class extends EventSource {
  close(): void {
    super.close()
    close()
  }
}

import('./data/spec.js')
