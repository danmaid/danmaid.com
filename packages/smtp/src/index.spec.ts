import { it, expect, afterAll, beforeAll, jest } from "@jest/globals";
import { server } from "./index";
import net from "node:net";
import { createTransport } from "nodemailer";
import * as store from "./store";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const dataDir = "data";

function getPort(server: Pick<net.Server, "address">): number {
  const addr = server.address();
  if (addr && typeof addr === "object") return addr.port;
  throw Error("port is not found.");
}

let sv: net.Server;
beforeAll(async () => {
  sv = server.listen();
});
afterAll(async () => {
  await new Promise((r) => sv.close(r));
  await new Promise<void>((r) => setTimeout(r, 100));
});

it("", async () => {
  const add = jest.spyOn(store, "add");
  const client = createTransport({ port: getPort(sv) });
  const sent = await client.sendMail({
    from: "xxx@danmaid.com",
    to: "yyy@danmaid.com",
    subject: "sss",
    text: "ＸＹＺ",
  });
  console.log("sent", sent);
  expect(add).toBeCalled();

  const rawId = await add.mock.results[0].value;
  if (typeof rawId !== "string") throw Error("rawId is not string");
  const raw = await store.get(rawId);
  const rawMeta = JSON.parse(
    await readFile(join(dataDir, rawId + ".meta"), { encoding: "utf-8" })
  );
  expect(rawMeta).toHaveProperty("envelope", {
    mailFrom: { address: "xxx@danmaid.com", args: false },
    rcptTo: [{ address: "yyy@danmaid.com", args: false }],
  });
  expect(rawMeta).toHaveProperty("Content-Type", "message/rfc822");
  expect(rawMeta).toHaveProperty("Mail-From", "xxx@danmaid.com");
  expect(rawMeta).toHaveProperty("Rcpt-To", ["yyy@danmaid.com"]);
});
