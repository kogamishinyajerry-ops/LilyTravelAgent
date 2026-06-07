import { test, expect, type ConsoleMessage } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const SCREENSHOT_PATH = "e2e/screenshots/dream.png";

/**
 * Smoke test for /dream route.
 *
 * IMPORTANT: This test does NOT call /api/* endpoints — no live API keys are
 * required. It only verifies the static UI loads and renders expected content.
 */
test.describe("/dream route", () => {
  test("loads main content and renders without unexpected console errors", async ({ page }) => {
    const unexpectedErrors: string[] = [];

    page.on("console", (msg: ConsoleMessage) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Filter out known noisy / non-fatal messages (e.g. fetch failures
        // to optional /api/* endpoints when no keys are configured).
        if (
          text.includes("Failed to fetch") ||
          text.includes("NetworkError") ||
          text.includes("404")
        ) {
          return;
        }
        unexpectedErrors.push(text);
      }
    });

    page.on("pageerror", (err) => {
      unexpectedErrors.push(err.message);
    });

    await page.goto("/dream", { waitUntil: "domcontentloaded" });

    // Wait for the main interactive shell to mount.
    const main = page.locator("main").first();
    await expect(main).toBeVisible({ timeout: 30_000 });

    // UI element assertion 1: the primary action label rendered by DreamRoadbook
    // ("开始造梦" / "Start" — Chinese or English depending on copy).
    // We assert the "造梦" token appears somewhere in the main content, which
    // is part of the page's known Chinese chrome.
    const bodyText = await main.innerText();
    expect(bodyText).toMatch(/造梦|dream|Dream/i);

    // UI element assertion 2: a visible input or button is present (the page
    // is interactive — there should be at least one control on screen).
    const controls = page.locator("button, input, textarea").first();
    await expect(controls).toBeVisible();

    // Capture a screenshot for visual reference. Create the dir first so the
    // write never fails on a fresh checkout.
    await mkdir(dirname(SCREENSHOT_PATH), { recursive: true });
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });

    expect(unexpectedErrors, `unexpected console errors:\n${unexpectedErrors.join("\n")}`).toEqual([]);
  });

  /**
   * Responsive behavior smoke test. Runs the same `/dream` page at three
   * viewport sizes — desktop / tablet / mobile — and verifies the layout
   * doesn't break (no horizontal overflow, main content is visible, the
   * template picker is reachable).
   */
  test.describe("responsive behavior", () => {
    for (const { label, width, height } of [
      { label: "desktop", width: 1280, height: 800 },
      { label: "tablet", width: 820, height: 1180 },
      { label: "mobile", width: 390, height: 844 },
    ]) {
      test(`renders cleanly at ${label} (${width}x${height})`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto("/dream", { waitUntil: "domcontentloaded" });

        const main = page.locator("main#main-content").first();
        await expect(main).toBeVisible({ timeout: 30_000 });

        // Body must not overflow horizontally — the layout should adapt
        // to the viewport, not introduce a horizontal scrollbar.
        const overflow = await page.evaluate(() => {
          return {
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
          };
        });
        expect(
          overflow.scrollWidth,
          `horizontal overflow at ${label}: scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`,
        ).toBeLessThanOrEqual(overflow.clientWidth + 1);

        // The template picker should still be reachable.
        const templateGrid = page.locator('[role="radiogroup"][aria-label="梦境模板"]');
        await expect(templateGrid).toBeAttached();

        // Snapshot at this viewport for the responsive-recording directory.
        const snapPath = `e2e/screenshots/dream-responsive-${label}.png`;
        await mkdir(dirname(snapPath), { recursive: true });
        await page.screenshot({ path: snapPath, fullPage: true });
      });
    }
  });
});
