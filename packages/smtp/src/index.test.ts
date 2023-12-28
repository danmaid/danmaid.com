import { test, beforeAll, afterAll, expect } from "@jest/globals";
import http2 from "node:http2";
import { randomUUID } from "node:crypto";

let client: http2.ClientHttp2Session;
beforeAll(async () => (client = http2.connect("https://danmaid.com")));
afterAll(async () => client.close());

test("", async () => {
  const id = randomUUID();
  const req = client.request({ ":method": "PUT", ":path": `/${id}` });
  const res = new Promise((r) => req.on("response", r));
  req.end();
  await expect(res).resolves.toBe({ ":status": 200 });
});
