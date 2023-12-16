import {
  test,
  expect,
  jest,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createServer } from "node:http";
import { Socket } from "node:net";
import { main } from "./handlers";

const dataDir = "data";

const server = createServer(main);
const connections = new Set<Socket>();
let baseUrl: string;
beforeAll(async () => {
  server.on("connection", (socket) => connections.add(socket));
  await new Promise((r) => server.listen(r));
  const addr = server.address();
  if (!addr || typeof addr !== "object") throw Error("addr is not object.");
  baseUrl = `http://localhost:${addr.port}`;
});
afterAll(async () => {
  connections.forEach((socket) => socket.destroy());
  await new Promise((r) => server.close(r));
});
beforeEach(async () => {
  jest.clearAllMocks();
});

test("PUT /xxx Content-Type: text/html => 200 data/xxx/text/html", async () => {
  const res = await fetch(new URL("/xxx", baseUrl), {
    method: "PUT",
    headers: { "Content-Type": "text/html" },
    body: "<html></html>",
  });
  expect(res.status).toBe(200);
  const data = readFile(join(dataDir, "xxx/text/html"), { encoding: "utf-8" });
  await expect(data).resolves.toBe("<html></html>");
});

test("GET /xxx => 404", async () => {
  const res = await fetch(new URL("/xxx", baseUrl));
  expect(res.status).toBe(404);
});

test("GET /xxx Accept: text/html => 200 Content-Type: text/html Content-Location: text/html", async () => {
  const res = await fetch(new URL("/xxx", baseUrl), {
    headers: { accept: "text/html" },
  });
  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toBe("text/html");
  expect(res.headers.get("Content-Location")).toBe("text/html");
});

test("GET /xxx/text/html => 200", async () => {
  const res = await fetch(new URL("/xxx", baseUrl));
  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toBe("text/html");
});

// describe.skip("", () => {
//   test("=> xxx", async () => {
//     const open = jest.spyOn(fs, "open");
//     await fetch(new URL("/xxx", baseUrl));
//     expect(open).toBeCalledWith(join(dataDir, "xxx"));
//   });

//   test("=> xxx", async () => {
//     const open = jest.spyOn(fs, "open");
//     await fetch(new URL("/xxx", baseUrl), { method: "PUT" });
//     expect(open).toBeCalledWith(join(dataDir, "xxx"), "w");
//   });

//   test("text/html => xxx", async () => {
//     const open = jest.spyOn(fs, "open");
//     await fetch(new URL("/xxx", baseUrl), {
//       method: "PUT",
//       headers: { "Content-Type": "text/html" },
//     });
//     expect(open).toBeCalledWith(join(dataDir, "xxx.text.html"), "w");
//   });

//   test("text/html; charset=utf-8 => xxx.text.html", async () => {
//     const open = jest.spyOn(fs, "open");
//     await fetch(new URL("/xxx", baseUrl), {
//       method: "PUT",
//       headers: { "Content-Type": "text/html; charset=utf-8" },
//     });
//     expect(open).toBeCalledWith(join(dataDir, "xxx.text.html"), "w");
//   });

//   test("application/json => xxx.application.json", async () => {
//     const open = jest.spyOn(fs, "open");
//     await fetch(new URL("/xxx", baseUrl), {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//     });
//     expect(open).toBeCalledWith(join(dataDir, "xxx.application.json"), "w");
//   });

//   test("application/vnd.danmaid.yyy+json => xxx.application.vnd.danmaid.yyy.json", async () => {
//     const open = jest.spyOn(fs, "open");
//     await fetch(new URL("/xxx", baseUrl), {
//       method: "PUT",
//       headers: { "Content-Type": "application/vnd.danmaid.yyy+json" },
//     });
//     expect(open).toBeCalledWith(
//       join(dataDir, "xxx.application.vnd.danmaid.yyy.json"),
//       "w"
//     );
//   });

//   test("text/html => xxx.text.html", async () => {
//     const open = jest.spyOn(fs, "open");
//     const res = await fetch(new URL("/xxx", baseUrl), {
//       headers: { accept: "text/html" },
//     });
//     expect(open).toBeCalledWith(join(dataDir, "xxx.text.html"));
//     expect(res.headers.get("content-type")).toBe("text/html");
//   });

//   test("application/json => xxx.application.json", async () => {
//     const open = jest.spyOn(fs, "open");
//     const res = await fetch(new URL("/xxx", baseUrl), {
//       headers: { accept: "application/json" },
//     });
//     expect(open).toBeCalledWith(join(dataDir, "xxx.application.json"));
//     expect(res.headers.get("content-type")).toBe("application/json");
//   });

//   test("application/vnd.danmaid.yyy+json => xxx.application.vnd.danmaid.yyy.json", async () => {
//     const open = jest.spyOn(fs, "open");
//     const res = await fetch(new URL("/xxx", baseUrl), {
//       headers: { accept: "application/vnd.danmaid.yyy+json" },
//     });
//     expect(open).toBeCalledWith(
//       join(dataDir, "xxx.application.vnd.danmaid.yyy.json")
//     );
//     expect(res.headers.get("content-type")).toBe(
//       "application/vnd.danmaid.yyy+json"
//     );
//   });

//   test("GET yyy.mjs => text/javascript", async () => {
//     const open = jest.spyOn(fs, "open");
//     const res = await fetch(new URL("/xxx", baseUrl), {
//       headers: { accept: "text/html" },
//     });
//     expect(open).toBeCalledWith(join(dataDir, "xxx.text.html"));
//     expect(res.headers.get("content-type")).toBe("text/html");
//   });
// });
