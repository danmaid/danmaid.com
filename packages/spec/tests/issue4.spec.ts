// サイバー感の追加 https://github.com/danmaid/danmaid.com/issues/4
import { test, expect } from "@playwright/test";

// Obsolets issue2("黒っぽい感じになっていること")
test("黒っぽい感じになっていること", async ({ page }) => {
  await page.goto("/");
  const body = page.locator("body");
  await expect(body).toHaveCSS("background-color", "rgb(26, 26, 26)");
  await expect(body).toHaveCSS("color", "rgb(182, 192, 226)");
});

// Obsoletes issue2("リンクの色が見えにくくないこと")
test("リンクの色が見えにくくないこと", async ({ page }) => {
  await page.goto("/");
  for (const link of await page.locator("a").all()) {
    expect(link).toHaveCSS("color", "rgb(182, 192, 226)");
  }
});
