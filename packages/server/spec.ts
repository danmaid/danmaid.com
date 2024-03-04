import { expect } from "https://deno.land/std@0.210.0/expect/expect.ts";
import {
  describe,
  beforeAll,
  afterAll,
  it,
} from "https://deno.land/std@0.212.0/testing/bdd.ts";

let proc: Deno.ChildProcess;
beforeAll(() => {
  const allows = ["net", "read", "env", "write"].map((v) => "--allow-" + v);
  const cmd = new Deno.Command(Deno.execPath(), {
    args: ["run", ...allows, "./server.ts"],
    // stdout: "null"
  });
  proc = cmd.spawn();
});
afterAll(async () => {
  proc.kill();
  await new Promise((r) => setTimeout(r, 100));
});

const tests = {
  'PUT /xxx BODY => 200': async () => {
    const body = new TextEncoder().encode('BODY')
    const res = await fetch('/xxx', { method: 'PUT', body })
    expect(res.status).toBe(200)
    await res.body?.cancel()
  },
  'GET /xxx => 200 BODY': async () => {
    const res = await fetch('/xxx')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('BODY')
  },
  'PUT /xxx text/plain TEXT => 200': async () => {
    const res = await fetch('/xxx', {
      method: 'PUT',
      headers: { 'content-type': 'text/plain' },
      body: 'TEXT'
    })
    expect(res.status).toBe(200)
    await res.body?.cancel()
  },
  'GET /xxx text/plain => 200 TEXT': async () => {
    const res = await fetch('/xxx', { headers: { accept: 'text/plain' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/plain')
    expect(await res.text()).toBe('TEXT')
  },
  'PUT /xxx application/json "JSON" => 200': async () => {
    const res = await fetch('/xxx', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify('JSON')
    })
    expect(res.status).toBe(200)
    await res.body?.cancel()
  },
  'GET /xxx application/json => 200 "JSON"': async () => {
    const res = await fetch('/xxx', { headers: { accept: 'application/json' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/json')
    expect(await res.json()).toBe('JSON')
  },
}

describe(() => {
  it(tests['PUT /xxx text/plain TEXT => 200'])
  it(tests['GET /xxx text/plain => 200 TEXT'])
  it(tests['PUT /xxx application/json "JSON" => 200'])
  it(tests['GET /xxx application/json => 200 "JSON"'])
  it(tests['PUT /xxx BODY => 200'])
  it(tests['GET /xxx => 200 BODY'])
})

describe(() => {
  it(tests['PUT /xxx BODY => 200'])
  it(tests['PUT /xxx text/plain TEXT => 200'])
  it(tests['PUT /xxx application/json "JSON" => 200'])
  it(tests['GET /xxx => 200 BODY'])
  it(tests['GET /xxx text/plain => 200 TEXT'])
  it(tests['GET /xxx application/json => 200 "JSON"'])
})

describe.only(() => {
  it('xxx', async () => {
    const res = await fetch('/xxx/yyy/zzz', {
      method: 'PUT',
      headers: { 'content-type': 'text/plain' },
      body: 'TEXT'
    })
    expect(res.status).toBe(200)
    await res.body?.cancel()
  })
  it('yyy', async () => {
    const res = await fetch('/xxx/yyy/zzz')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('TEXT')
  })
})