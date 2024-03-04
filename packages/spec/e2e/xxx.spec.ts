import { test, expect } from "@playwright/test";

test("xxx", async ({ request }) => {
  const text = "xxx";
  const x = await request.put("/xxx", { data: text });
  expect(x.status()).toBe(200);
  const y = await request.get("/xxx");
  await expect(y.text()).resolves.toBe(text);
});

test.describe("nego", () => {
  test.describe.configure({ mode: "serial" });
  const text = "yyy";
  test("PUT", async ({ request }) => {
    const res = await request.put("/yyy", {
      data: text,
      headers: { "content-type": "text/plain" },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()).toMatchObject({
      "content-location": "https://danmaid.com/yyy/text/plain",
    });
  });

  test("GET", async ({ request }) => {
    const res = await request.get("/yyy");
    expect(res.status()).toBe(200);
    expect(res.headers()).toMatchObject({
      "content-location": "https://danmaid.com/yyy/text/plain",
      "content-type": "text/plain",
    });
    await expect(res.text()).resolves.toBe(text);
  });

  test("GET permanent", async ({ request }) => {
    const res = await request.get("/yyy/text/plain");
    expect(res.status()).toBe(200);
    expect(res.headers()).toMatchObject({ "content-type": "text/plain" });
    await expect(res.text()).resolves.toBe(text);
  });

  test("GET index+json", async ({ request }) => {
    const res = await request.get("/", {
      headers: { accept: "application/vnd.danmaid.index+json" },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()).toMatchObject({
      "content-type": "application/vnd.danmaid.index+json",
    });
    await expect(res.json()).resolves.toContainEqual({ id: "yyy" });
  });

  test("GET index+json permanent", async ({ request }) => {
    const res = await request.get("/application/vnd.danmaid.index+json");
    expect(res.status()).toBe(200);
    await expect(res.json()).resolves.toContainEqual({ id: "yyy" });
  });
});

test.describe("default", () => {
  test.describe.configure({ mode: "serial" });
  const text = "zzz";
  const html = "<html></html>";

  test.beforeAll(async ({ request }) => {
    await request.delete("/zzz");
  });

  test("GET", async ({ request }) => {
    const res = await request.get("/zzz");
    expect(res.status()).toBe(404);
  });

  test("PUT create", async ({ request }) => {
    const res = await request.put("/zzz", {
      data: text,
      headers: { "content-type": "text/plain" },
    });
    expect(res.status()).toBe(200);
  });

  test("GET set default", async ({ request }) => {
    const res = await request.get("/zzz");
    expect(res.status()).toBe(200);
    expect(res.headers()).toMatchObject({ "content-type": "text/plain" });
    await expect(res.text()).resolves.toBe(text);
  });

  test("PUT update", async ({ request }) => {
    const res = await request.put("/zzz", {
      data: html,
      headers: { "content-type": "text/html" },
    });
    expect(res.status()).toBe(200);
  });

  test("GET keep default", async ({ request }) => {
    const res = await request.get("/zzz");
    expect(res.status()).toBe(200);
    expect(res.headers()).toMatchObject({ "content-type": "text/plain" });
    await expect(res.text()).resolves.toBe(text);
  });
});
