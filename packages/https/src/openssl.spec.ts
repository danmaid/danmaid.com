import { createCSR } from "./openssl";
import { generateKeyPair } from "node:crypto";
import { expect, test } from "@jest/globals";
import { exec } from "node:child_process";
import { promisify } from "node:util";

test("createCSR", async () => {
  const keys = await promisify(generateKeyPair)("ec", { namedCurve: "P-256" });
  const csr = await createCSR("danmaid.com", keys.privateKey);
  const proc = promisify(exec)("openssl req -inform DER -text");
  proc.child.stdin?.end(csr);
  const { stdout: text } = await proc;
  expect(text).toMatch("Certificate Request");
  expect(text).toMatch("Subject: CN = danmaid.com");
});
