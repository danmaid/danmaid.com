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

beforeAll(async () => {
  const path = join(dataDir, "xxx");
  try {
    await Deno.remove(path, { recursive: true });
    await Deno.remove(path + headerExt);
  } catch {}
  await expect(Deno.stat(path)).rejects.toThrow();
  await expect(Deno.stat(path + headerExt)).rejects.toThrow();
});

describe("PUT /xxx with text", () => {
  it("PUT /xxx with text => 200", async () => {
    const body = "xxx";
    const res = await fetch("https://localhost/xxx", { method: "PUT", body });
    expect(res.status).toBe(200);
    await res.body?.cancel();
  });

  it("check /xxx/text/plain", async () => {
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
  });

  it("check /xxx", async () => {
    const path = join(dataDir, "xxx");
    const h = await Deno.stat(path + headerExt);
    expect(h.isFile).toBe(true);
    const text = await Deno.readTextFile(path + headerExt);
    const meta = JSON.parse(text);
    expect(meta["content-location"]).toBe("/xxx/text/plain");
    const b = await Deno.stat(path);
    expect(b.isDirectory).toBe(true);
  });
});

describe("GET /xxx", () => {
  it("GET /xxx => 200", async () => {
    const res = await fetch("https://localhost/xxx");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain;charset=UTF-8");
    expect(res.headers.get("content-location")).toBe("/xxx/text/plain");
    await expect(res.text()).resolves.toBe("xxx");
  });
});

describe("PUT /xxx without body", () => {
  beforeAll(async () => {
    await expect(Deno.stat(join(dataDir, "xxx"))).resolves.toMatchObject({
      isDirectory: true,
    });
    await expect(
      Deno.stat(join(dataDir, "xxx" + headerExt))
    ).resolves.toBeDefined();
    await expect(
      Deno.stat(join(dataDir, "xxx/text/plain"))
    ).resolves.toBeDefined();
    await expect(
      Deno.stat(join(dataDir, "xxx/text/plain" + headerExt))
    ).resolves.toBeDefined();
  });

  it("PUT /xxx without body => 200", async () => {
    const headers = { xxx: "xxx", "content-type": "text/plain" };
    const res = await fetch("https://localhost/xxx", {
      method: "PUT",
      headers,
    });
    expect(res.status).toBe(200);
    await res.body?.cancel();
  });

  it("check /xxx/text/plain", async () => {
    const path = join(dataDir, "xxx/text/plain");
    const h = await Deno.stat(path + headerExt);
    expect(h.isFile).toBe(true);
    const text = await Deno.readTextFile(path + headerExt);
    const meta = JSON.parse(text);
    expect(meta["content-type"]).toBe("text/plain");
    expect(meta["xxx"]).toBe("xxx");

    const b = await Deno.stat(path);
    expect(b.isFile).toBe(true);
    const body = await Deno.readTextFile(path);
    expect(body).toBe("xxx");
  });

  it("check /xxx", async () => {
    const path = join(dataDir, "xxx");
    const h = await Deno.stat(path + headerExt);
    expect(h.isFile).toBe(true);
    const text = await Deno.readTextFile(path + headerExt);
    const meta = JSON.parse(text);
    expect(meta["content-location"]).toBe("/xxx/text/plain");
    const b = await Deno.stat(path);
    expect(b.isDirectory).toBe(true);
  });
});

describe("GET /xxx 2nd", () => {
  it("GET /xxx => 200", async () => {
    const res = await fetch("https://localhost/xxx");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain");
    expect(res.headers.get("content-location")).toBe("/xxx/text/plain");
    await expect(res.text()).resolves.toBe("xxx");
  });
});
