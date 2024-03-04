import { expect } from "https://deno.land/std@0.210.0/expect/mod.ts";
import { Path } from "./Path.ts";

const root = new Path();

Deno.test("/ => /", async () => {
  const x = new Promise((r) => root.addEventListener("/", r));
  const e = new Event("/");
  expect(root.dispatchEvent(e)).toBe(true);
  await expect(x).resolves.toBe(e);
});

Deno.test("/xxx => /", async () => {
  const x = new Promise((r) => root.addEventListener("/", r));
  const e = new Event("/xxx", { bubbles: true });
  expect(root.dispatchEvent(e)).toBe(true);
  await expect(x).resolves.toBe(e);
});
