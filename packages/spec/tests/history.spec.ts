import { test, expect } from "@playwright/test";

test.describe("マージされた issue の情報が記載されていること", () => {
  test("issue3", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator("a", {
        hasText: "https://github.com/danmaid/danmaid.com/issues/3",
      })
    ).toBeVisible();
  });

  test("issue4", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator("a", {
        hasText: "https://github.com/danmaid/danmaid.com/issues/4",
      })
    ).toBeVisible();
  });

  test("issue5", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator("a", {
        hasText: "https://github.com/danmaid/danmaid.com/issues/5",
      })
    ).toBeVisible();
  });
});
