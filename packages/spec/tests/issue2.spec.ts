// Re: ゼロから始める。 https://github.com/danmaid/danmaid.com/issues/2
import { test, expect } from "@playwright/test";

// https://github.com/danmaid/danmaid.com/commit/1546b76a0bd073b5287f74172d3d88e01b201a81#diff-0eb547304658805aad788d320f10bf1f292797b5e6d745a3bf617584da017051
test("タイトルが設定されていること", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/男メイド/);
});

test("言語が設定されていること", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
});

// Obsoleted by issue4
test.skip("黒っぽい感じになっていること", async ({ page }) => {
  await page.goto("/");
  const body = page.locator("body");
  await expect(body).toHaveCSS("background-color", "rgb(100, 100, 255)");
  await expect(body).toHaveCSS("color", "rgb(238, 238, 238)");
});

// Obsoleted by issue4
test.skip("リンクの色が見えにくくないこと", async ({ page }) => {
  await page.goto("/");
  for (const link of await page.locator("a").all()) {
    expect(link).toHaveCSS("color", "rgb(100, 100, 255)");
  }
});

test("各種リンクが存在すること", async ({ page }) => {
  await page.goto("/");
  const links = page.locator("a");
  expect(await links.count()).toBeGreaterThanOrEqual(1);
});
