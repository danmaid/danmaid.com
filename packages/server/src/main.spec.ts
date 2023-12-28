import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import { server } from "./main";
import https from "node:https";
import { IncomingMessage } from "node:http";
import http2 from "node:http2";
import EventSource from "eventsource";

beforeAll(async () => {
  await new Promise((r) => server.on("listening", r));
});
afterAll(async () => server.close());

test("HTTP/1 で接続できること", async () => {
  const res = await new Promise<IncomingMessage>((resolve) =>
    https.get("https://localhost", resolve)
  );
  expect(res.statusCode).toBeGreaterThan(0);
  expect(res.httpVersionMajor).toBe(1);
});

describe("HTTP2", () => {
  let client: http2.ClientHttp2Session;
  beforeAll(async () => (client = http2.connect("https://localhost")));
  afterAll(async () => client.close());

  test("HTTP/2 で接続できること", async () => {
    const res = new Promise<http2.ClientHttp2Stream>((resolve, reject) =>
      client.request().on("response", resolve).on("error", reject).end()
    );
    await expect(res).resolves.toHaveProperty(":status", 404);
  });
});

describe("SSE", () => {
  let client: http2.ClientHttp2Session;
  let eventsource: EventSource;
  beforeAll(async () => {
    client = http2.connect("https://localhost");
    eventsource = new EventSource("https://localhost");
    await new Promise((r) => (eventsource.onopen = r));
  });
  afterAll(async () => {
    client.close();
    eventsource.close();
  });

  test("HTTP2 => HTTP1", async () => {
    const event = new Promise<MessageEvent>((resolve) =>
      eventsource.addEventListener("PUT", resolve)
    );
    const res = new Promise<http2.ClientHttp2Stream>((resolve, reject) =>
      client
        .request({ ":method": "PUT", ":path": "/xxx" })
        .on("response", resolve)
        .on("error", reject)
        .end()
    );
    await expect(event).resolves.toHaveProperty("type", "PUT");
    await expect(event).resolves.toHaveProperty("data", "/xxx");
  });
});
