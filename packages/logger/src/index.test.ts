import { afterAll, describe, expect, test } from "@jest/globals";
import http2 from "node:http2";
import { randomUUID } from "node:crypto";

describe("", () => {
  const id = randomUUID();
    // const client = http2.connect("https://danmaid.com");
  const client = http2.connect("https://localhost", {
    rejectUnauthorized: false,
  });
  const data = new Array(30).fill(0).map(() => randomUUID());
  afterAll(async () => {
    client.close();
  });

  test.concurrent("PUT", async () => {
    const req = client.request({
      [http2.constants.HTTP2_HEADER_METHOD]: http2.constants.HTTP2_METHOD_PUT,
      [http2.constants.HTTP2_HEADER_PATH]: "/" + id,
    });
    for (const d of data) {
      req.write(d + "\n");
      await new Promise<void>((r) => setTimeout(r, 100));
    }
    req.end();
  });

  test.concurrent("GET", async () => {
    const req = client.request({
      [http2.constants.HTTP2_HEADER_PATH]: "/" + id,
    });
    const headers = await new Promise<
      http2.IncomingHttpHeaders & http2.IncomingHttpStatusHeader
    >((r) => req.on("response", r));
    expect(headers[":status"]).toBe(200);
    let d = "";
    req.on("data", (chunk) => (d += chunk));
    await new Promise((r) => req.on("end", r));
    expect(d).toBe(data.join("\n") + "\n");
  });

  test("GET", async () => {
    const req = client.request({
      [http2.constants.HTTP2_HEADER_PATH]: "/" + id,
    });
    const headers = await new Promise<
      http2.IncomingHttpHeaders & http2.IncomingHttpStatusHeader
    >((r) => req.on("response", r));
    expect(headers[":status"]).toBe(200);
    let d = "";
    req.on("data", (chunk) => (d += chunk));
    await new Promise((r) => req.on("end", r));
    expect(d).toBe(data.join("\n") + "\n");
  });
});
