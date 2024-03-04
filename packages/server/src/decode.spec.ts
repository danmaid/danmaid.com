import { afterAll, beforeAll, expect, test } from "@jest/globals";
import { server } from "./main";
import http2 from "node:http2";

let client: http2.ClientHttp2Session;
beforeAll(async () => {
  await new Promise((r) => server.on("listening", r));
  client = http2.connect("https://localhost", { rejectUnauthorized: false });
});
afterAll(async () => {
  client.close();
  server.close();
});

test.only("message/rfc822", async () => {
  const h = `Subject: aaa
From: =?UTF-8?B?5bGx55Sw5a+b5rK7?= <owner@danmaid.co.jp>
To: test@self.danmaid.com
Content-Type: multipart/alternative; boundary="000000000000c3a305060da5cc0b"
X-XX: xxx
 yyy
`;
  const b = `--000000000000c3a305060da5cc0b
Content-Type: text/plain; charset="UTF-8"

aaa

--000000000000c3a305060da5cc0b
Content-Type: text/html; charset="UTF-8"

<div dir="ltr">aaa<div><br></div></div>

--000000000000c3a305060da5cc0b--
`;

  const req = client.request({
    ":method": "POST",
    ":path": "/decode",
    "content-type": "message/rfc822",
  });
  req.write(h.replace(/\n/g, "\r\n"));
  req.write("\r\n");
  req.write(b.replace(/\n/g, "\r\n"));
  req.end();
  const headers: http2.IncomingHttpHeaders = await new Promise((resolve) =>
    req.on("response", resolve)
  );
  expect(headers).toMatchObject({
    ":status": 201,
    location: expect.any(String),
  });
  if (headers.location) {
    const req = client.request({ ":path": headers.location });
    const h = await new Promise((r) => req.on("response", r));
    expect(h).toMatchObject({
      subject: "aaa",
      from: "=?UTF-8?B?5bGx55Sw5a+b5rK7?= <owner@danmaid.co.jp>",
      to: "test@self.danmaid.com",
      "content-type":
        'multipart/alternative; boundary="000000000000c3a305060da5cc0b"',
      "x-xx": "xxx yyy",
    });
    const chunks: Uint8Array[] = [];
    req.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    await new Promise((resolve) => req.on("end", resolve));
    const body = Buffer.concat(chunks);
    const text = body.toString("utf-8");
    expect(text).toBe(b.replace(/\n/g, "\r\n"));
  }
});

test("multipart/alternative", async () => {
  const b = `--000000000000c3a305060da5cc0b
  Content-Type: text/plain; charset="UTF-8"
  
  aaa
  
  --000000000000c3a305060da5cc0b
  Content-Type: text/html; charset="UTF-8"
  
  <div dir="ltr">aaa<div><br></div></div>
  
  --000000000000c3a305060da5cc0b--
  `;

  const req = client.request({
    ":method": "POST",
    ":path": "/decode",
    "content-type": "multipart/alternative",
  });
  req.write(b.replace(/\n/g, "\r\n"));
  req.end();
  const headers: http2.IncomingHttpHeaders = await new Promise((resolve) =>
    req.on("response", resolve)
  );
  expect(headers).toMatchObject({
    ":status": 300,
    link: "</xxx>; type=text/plain, </yyy>; type=text/html",
  });
  const links = Array.isArray(headers.link)
    ? headers.link
    : headers.link?.split(",") || [];
  expect(links).toHaveLength(2);
  for (const link of links) {
    const path = /<(.+)>/.exec(link)?.[1];
    const type = /type=(.+)/.exec(link)?.[1];
    const req = client.request({ ":path": path });
    const h = await new Promise((r) => req.on("response", r));
    expect(h).toMatchObject({ "content-type": type });
    const chunks: Uint8Array[] = [];
    req.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    await new Promise((resolve) => req.on("end", resolve));
    const body = Buffer.concat(chunks);
    const text = body.toString("utf-8");
    expect(text).toBe(b.replace(/\n/g, "\r\n"));
  }
});
