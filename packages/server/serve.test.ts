import { expect } from "https://deno.land/std@0.210.0/expect/expect.ts";

async function getBody(
  readable?: ReadableStream | null
): Promise<ReadableStream> {
  if (!readable) throw Error("not found.");
  const [x, y] = readable.tee();
  const r = y.getReader();
  const { done } = await r.read();
  r.cancel();
  if (done) throw Error("empty.");
  return x;
}

Deno.test("PUT without body => Error", async () => {
  const ctrl = new AbortController();
  const x = new Promise<ReadableStream>((resolve) => {
    Deno.serve({ port: 9999, signal: ctrl.signal }, (req) => {
      getBody(req.body).then(resolve).catch(resolve);
      return new Response();
    });
  });
  const res = await fetch("http://localhost:9999", { method: "PUT" });
  await expect(x).resolves.toThrow("empty.");
  await res.body?.cancel();
  ctrl.abort();
});

Deno.test("PUT with body => ReadableStream", async () => {
  const ctrl = new AbortController();
  const x = new Promise<ReadableStream>((resolve) => {
    Deno.serve({ port: 9999, signal: ctrl.signal }, (req) => {
      getBody(req.body).then(resolve).catch(resolve);
      return new Response();
    });
  });
  const body = "x";
  const res = await fetch("http://localhost:9999", { method: "PUT", body });
  await expect(x).resolves.toBeInstanceOf(ReadableStream);
  await res.body?.cancel();
  ctrl.abort();
});

Deno.test("GET (body is null) => Error", async () => {
  const ctrl = new AbortController();
  const x = new Promise<ReadableStream>((resolve) => {
    Deno.serve({ port: 9999, signal: ctrl.signal }, (req) => {
      getBody(req.body).then(resolve).catch(resolve);
      return new Response();
    });
  });
  const res = await fetch("http://localhost:9999", { method: "GET" });
  await expect(x).resolves.toThrow("not found.");
  await res.body?.cancel();
  ctrl.abort();
});
