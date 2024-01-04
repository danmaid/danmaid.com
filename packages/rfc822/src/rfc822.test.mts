import { test, expect } from "vitest";

test("TextEncoder で変換しても長さは変わらない", async () => {
  const x = "1\r\n2\r\n3\r\n";
  const y = new TextEncoder().encode(x);
  expect(x.length).toBe(y.length);
});
