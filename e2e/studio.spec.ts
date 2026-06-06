import { test, expect, type ConsoleMessage } from "@playwright/test";

/**
 * Static UI smoke test for the /studio route.
 *
 * Verifies that the Studio page loads, renders its primary Chinese heading,
 * and exposes the main interactive form. We intentionally do NOT trigger
 * any /api/* calls (no live API keys are configured in this environment).
 */
test.describe("/studio", () => {
  test("renders the Studio page with main content and screenshot", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg: ConsoleMessage) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/studio");

    // Wait for the primary heading rendered by components/studio-mode.tsx.
    const heading = page.getByRole("heading", { name: "旅游路书 Agent 录屏台" });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Confirm the brief form's "目的地" section is rendered (Chinese UI element).
    const destinationLabel = page.getByText("目的地", { exact: true }).first();
    await expect(destinationLabel).toBeVisible();

    // Capture a screenshot for visual verification.
    await page.screenshot({
      path: "e2e/screenshots/studio.png",
      fullPage: true,
    });

    // Allow favicon / network 4xx for non-essential assets, but fail on
    // unexpected script errors emitted during the static load.
    const unexpectedErrors = consoleErrors.filter(
      (text) =>
        !text.includes("favicon") &&
        !text.includes("Failed to load resource") &&
        !text.includes("404"),
    );
    expect(unexpectedErrors, unexpectedErrors.join("\n")).toEqual([]);
  });
});
