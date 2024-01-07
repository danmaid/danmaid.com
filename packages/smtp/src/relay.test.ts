import { test } from "@jest/globals";
import { createTransport } from "nodemailer";
import fs from "node:fs/promises";

test("", async () => {
  const t = createTransport({
    host: "localhost",
    port: 25,
    // host: "aspmx.l.google.com",
    // port: 25,
    logger: true,
  });
  const res = await t.sendMail({
    envelope: { from: "relay@danmaid.com", to: "owner@danmaid.com" },
    raw: await fs.readFile("./sample.eml"),
  });
  console.log(res);
});
