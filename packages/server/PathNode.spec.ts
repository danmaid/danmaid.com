import { expect } from "https://deno.land/std@0.210.0/expect/expect.ts";
import { PathEvent, PathNode } from "./PathNode.ts";

Deno.test("bubbling", () => {
  const calls: number[] = [];
  const call = (label: number) => () => {
    calls.push(label);
  };

  const xxx = new PathNode("/xxx");
  xxx.addEventListener("request", call(1));
  xxx.addEventListener("request", call(2), { capture: true });

  const yyy = new PathNode("/xxx/yyy");
  yyy.addEventListener("request", call(3));
  yyy.addEventListener("request", call(4), { capture: true });
  yyy.dispatchEvent(new PathEvent("request"));

  expect(calls).toEqual([2, 4, 3, 1]);
});

Deno.test("stopPropergation", () => {
  const calls: number[] = [];
  const call = (label: number) => () => {
    calls.push(label);
  };
  const stop = (ev: Event) => ev.stopPropagation();

  const xxx = new PathNode("/xxx");
  xxx.addEventListener("request", call(1));
  xxx.addEventListener("request", call(2), { capture: true });

  const yyy = new PathNode("/xxx/yyy");
  yyy.addEventListener("request", call(3));
  yyy.addEventListener("request", call(4), { capture: true });
  yyy.addEventListener("request", stop);
  yyy.dispatchEvent(new PathEvent("request"));

  expect(calls).toEqual([2, 4, 3]);
});
