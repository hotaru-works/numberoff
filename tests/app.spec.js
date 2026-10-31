import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";

const CAR = fileURLToPath(new URL("./fixtures/car.jpg", import.meta.url));

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // the preview server sends the production CSP; any violation is a bug
  page.on("console", (m) => /Content Security Policy/i.test(m.text()) && errors.push(m.text()));
  page.errors = errors;
  // use the plain download path (no Web Share) so the test can catch saved files
  await page.addInitScript(() => {
    delete Navigator.prototype.share;
    delete Navigator.prototype.canShare;
  });
  await page.goto("/");
});

test.afterEach(async ({ page }) => {
  expect(page.errors).toEqual([]);
});

test("first visit shows the guide, then the empty screen", async ({ page }) => {
  await expect(page).toHaveTitle(/NumberOFF/);
  await expect(page.locator("#ob")).toBeVisible();
  await page.click("#obSkip");
  await expect(page.locator("#ob")).toBeHidden();
  await expect(page.locator("#empty")).toBeVisible();
});

test("detection model loads", async ({ page }) => {
  await expect(page.locator("#mst")).toHaveClass("on", { timeout: 60_000 });
});

test("open a photo, mark it OK and save it", async ({ page }) => {
  await page.click("#obSkip");
  await page.setInputFiles("#pick", CAR);
  await expect(page.locator("#work")).toBeVisible();
  await expect(page.locator("#th .tb:not(.add)")).toHaveCount(1);
  // wait until detection has finished (or was skipped)
  await expect(page.locator("#mst")).not.toHaveClass("ld", { timeout: 60_000 });
  await expect(page.locator("#busy")).toBeHidden({ timeout: 60_000 });
  await expect(page.locator("#go")).toBeEnabled();

  await page.click("#go");
  const download = page.waitForEvent("download");
  await page.click("#sv");
  expect((await download).suggestedFilename()).toMatch(/^NumberOFF_\d{8}_\d{6}\.jpg$/);
});

test("language can be switched to English", async ({ page }) => {
  await page.click("#obSkip");
  await page.click("#more");
  await page.click('#lseg [data-l="en"]');
  await page.click("#mclose");
  await expect(page.locator("#s1")).toHaveText("Choose");
});

test("works offline after the first visit", async ({ page, context }) => {
  await expect(page.locator("#mst")).toHaveClass("on", { timeout: 60_000 });
  // the service worker is registered shortly after the model has loaded
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#s1")).toHaveText("選ぶ");
  // the scripts, the runtime and the model all come from the service worker cache
  await expect(page.locator("#mst")).toHaveClass("on", { timeout: 60_000 });
  await context.setOffline(false);
});

test("unknown pages return 404 instead of the app", async ({ page }) => {
  const r = await page.goto("/no-such-page");
  expect(r.status()).toBe(404);
});
