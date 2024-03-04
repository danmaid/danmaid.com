import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import { Readable, PassThrough } from "node:stream";
import { createInterface } from "node:readline/promises";
import rl from "node:readline";
import { Worker } from "node:worker_threads";
import path from "node:path";

test("", async () => {
  const data = "xxx\r\nyyy\nzzz";
  const lines = [];
  const reader = createInterface(Readable.from(data));
  const stream = new PassThrough();
  const x = new PassThrough();
  x.write("xxx");
  x.setEncoding("utf-8");
  expect(x.read()).toBe("xxx");
  for await (const line of reader) {
    lines.push(line);
  }
  expect(lines).toHaveLength(3);
  expect(lines[0]).toBe("xxx");
  expect(lines[1]).toBe("yyy");
  expect(lines[2]).toBe("zzz");
});

test("", async () => {
  const dataDir = "data";
  const { default: w } = await import(
    path.join(process.cwd(), dataDir, "/decode" + ".mjs")
  );
  expect(w).toBeInstanceOf(Function);
});
