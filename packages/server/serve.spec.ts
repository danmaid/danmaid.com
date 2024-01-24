import { expect } from "https://deno.land/std@0.210.0/expect/expect.ts";
import { join } from "https://deno.land/std@0.212.0/path/join.ts";
import {
  describe,
  beforeAll,
  afterAll,
  it,
} from "https://deno.land/std@0.212.0/testing/bdd.ts";

const dataDir = "./data";
const headerExt = ".header.json";

describe("xx", () => {
  let proc: Deno.ChildProcess;
  beforeAll(() => {
    const allows = ["net", "read", "env", "write"].map((v) => "--allow-" + v);
    const cmd = new Deno.Command(Deno.execPath(), {
      args: ["run", ...allows, "./serve.ts"],
    });
    proc = cmd.spawn();
  });
  afterAll(async () => {
    proc.kill();
    await new Promise((r) => setTimeout(r, 100));
  });

  it("PUT", async () => {
    const body = "xxx";
    const res = await fetch("https://localhost/xxx", { method: "PUT", body });
    expect(res.status).toBe(200);
    await res.body?.cancel();
    {
      const path = join(dataDir, "xxx/text/plain");
      const h = await Deno.stat(path + headerExt);
      expect(h.isFile).toBe(true);
      const text = await Deno.readTextFile(path + headerExt);
      const meta = JSON.parse(text);
      expect(meta["content-type"]).toBe("text/plain;charset=UTF-8");

      const b = await Deno.stat(path);
      expect(b.isFile).toBe(true);
      const body = await Deno.readTextFile(path);
      expect(body).toBe("xxx");
    }
    {
      const path = join(dataDir, "xxx");
      const h = await Deno.stat(path + headerExt);
      expect(h.isFile).toBe(true);
      const text = await Deno.readTextFile(path + headerExt);
      const meta = JSON.parse(text);
      expect(meta["content-location"]).toBe("/xxx/text/plain");
      const b = await Deno.stat(path);
      expect(b.isDirectory).toBe(true);
    }
  });
});
