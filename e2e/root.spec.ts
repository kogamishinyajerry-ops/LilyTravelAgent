import { test, expect, type ConsoleMessage } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
});

test.describe("Root route /", () => {
  test("loads main content without unexpected console errors", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg: ConsoleMessage) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Filter out well-known dev-only noise from Next.js dev server
        // and expected static-asset 404s (e.g. favicon).
        if (
          text.includes("Download the React DevTools") ||
          text.includes("Fast Refresh") ||
          text.includes("Failed to load resource") ||
          text.includes("favicon")
        ) {
          return;
        }
        consoleErrors.push(text);
      }
    });

    page.on("pageerror", (err) => {
      consoleErrors.push(`pageerror: ${err.message}`);
    });

    await page.goto("/");

    // Wait for the main app frame to mount
    const main = page.locator("main.app-frame, main").first();
    await expect(main).toBeVisible({ timeout: 30000 });

    // The brand heading contains Chinese text identifying the app
    const heading = page.getByRole("heading", { name: /AI 旅行路书 Agent/ });
    await expect(heading).toBeVisible();

    // The primary action button is part of the brief form
    const primaryAction = page.getByRole("button", { name: /生成大理路书/ });
    await expect(primaryAction).toBeVisible();

    // Capture a screenshot for visual reference
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "root.png"),
      fullPage: true,
    });

    // No unexpected console errors
    expect(
      consoleErrors,
      `Unexpected console errors: ${consoleErrors.join("\n")}`,
    ).toEqual([]);
  });
});
