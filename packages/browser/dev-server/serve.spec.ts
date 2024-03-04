import { expect } from "https://deno.land/std@0.210.0/expect/expect.ts";
// import { describe, it } from "https://deno.land/std@0.212.0/testing/bdd.ts";
import { EventSource } from './EventSource.ts'

declare global {
  var it: any
  var expect: any
  var describe: any
}
globalThis.it = Deno.test
globalThis.expect = expect
globalThis.describe = (title: string, fn: () => void) => fn()
globalThis.EventSource = EventSource as any

import('./serve.ts')
import('../server.spec.js')
