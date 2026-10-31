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

test("a very large photo is shrunk to the size limit without distortion", async ({ page }) => {
  await page.click("#obSkip");
  // a 6000x4000 (24 MP) JPEG, above the 16 MP limit
  const jpg = await page.evaluate(async () => {
    const c = new OffscreenCanvas(6000, 4000);
    const g = c.getContext("2d");
    g.fillStyle = "#3a7";
    g.fillRect(0, 0, 6000, 4000);
    const b = await c.convertToBlob({ type: "image/jpeg", quality: 0.8 });
    return [...new Uint8Array(await b.arrayBuffer())];
  });
  await page.setInputFiles("#pick", { name: "big.jpg", mimeType: "image/jpeg", buffer: Buffer.from(jpg) });
  await expect(page.locator("#th .tb:not(.add)")).toHaveCount(1);
  await expect(page.locator("#busy")).toBeHidden({ timeout: 60_000 });
  await page.click("#go");
  const download = page.waitForEvent("download");
  await page.click("#sv");
  const buf = await (await download).createReadStream().then(async (s) => {
    const parts = [];
    for await (const p of s) parts.push(p);
    return Buffer.concat(parts);
  });
  // read the saved JPEG's size from its frame header
  let o = 2, w = 0, h = 0;
  while (o < buf.length) {
    const m = buf[o + 1], len = buf.readUInt16BE(o + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) {
      h = buf.readUInt16BE(o + 5);
      w = buf.readUInt16BE(o + 7);
      break;
    }
    o += 2 + len;
  }
  expect(w * h).toBeLessThanOrEqual(16e6);
  expect(w * h).toBeGreaterThan(15e6);
  expect(Math.abs(w / h - 1.5)).toBeLessThan(0.01);
});

test("search and share information is in the page", async ({ page, request }) => {
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://numberoff.pages.dev/og.jpg");
  expect((await request.get("/og.jpg")).ok()).toBe(true);
  // folded by default: the text is in the HTML for search engines, the start screen stays quiet
  await expect(page.locator("#about summary")).toBeVisible();
  await expect(page.locator("#about h2")).toBeHidden();
  await expect(page.locator("#about h2")).toHaveText("写真のナンバープレートを、自動で隠す無料Webアプリ");
  // the introduction is only on the start screen
  await page.click("#obSkip");
  await page.setInputFiles("#pick", CAR);
  await expect(page.locator("#about")).toBeHidden();
});

test.describe("search engine crawler", () => {
  test.use({ locale: "en-US", userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" });
  test("sees the Japanese page", async ({ page }) => {
    await expect(page).toHaveTitle("NumberOFF｜写真のナンバープレートを自動で隠す無料Webアプリ");
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  });
});

test("after choosing a size, editing shows only the cropped area", async ({ page }) => {
  await page.click("#obSkip");
  await page.setInputFiles("#pick", CAR);
  await expect(page.locator("#busy")).toBeHidden({ timeout: 60_000 });
  await page.click("#tSize");
  await page.click('#chips [data-r="4:5"]');
  // OK finishes resizing
  await page.click("#go");
  const r = await page.locator("#cw").boundingBox();
  expect(Math.abs(r.width / r.height - 0.8)).toBeLessThan(0.02);
  // back to the original size: the whole photo again (1200x800)
  await page.click("#tSize");
  await page.click('#chips [data-r=""]');
  await page.click("#tSize");
  const r2 = await page.locator("#cw").boundingBox();
  expect(Math.abs(r2.width / r2.height - 1.5)).toBeLessThan(0.02);
});
