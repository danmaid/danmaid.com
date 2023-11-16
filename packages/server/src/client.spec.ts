import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import { request, isLoopbackRequest, isLoopbackSocket } from "./client";
import { Server, IncomingMessage } from "node:http";
import { Socket } from "node:net";

describe("Loopback detection", () => {
  let server: Server;
  let url: string;
  beforeAll(async () => {
    server = new Server();
    await new Promise((r) => server.listen(r));
    const addr = server.address();
    if (!addr || typeof addr !== "object") throw Error("unsupport addr.");
    const hostname =
      addr.family === "IPv6" ? `[${addr.address}]` : addr.address;
    url = `http://${hostname}:${addr.port}`;
  });
  afterAll(async () => {
    await new Promise((r) => server.close(r));
  });

  test("socket", async () => {
    const socket = new Promise<Socket>((resolve) => {
      server.once("request", (req, res) => {
        resolve(req.socket);
        res.end();
      });
    });
    request(url).end();
    expect(isLoopbackSocket(await socket)).toBe(true);
  });

  test("request", async () => {
    const req = new Promise<IncomingMessage>((resolve) => {
      server.once("request", (req, res) => {
        resolve(req);
        res.end();
      });
    });
    request(url).end();
    expect(isLoopbackRequest(await req)).toBe(true);
  });
});
