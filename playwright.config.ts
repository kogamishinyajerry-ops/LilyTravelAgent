import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

// Allow pointing at a pre-installed Chrome when bundled browsers cannot be downloaded
// (useful in restricted networks). Set PLAYWRIGHT_CHROME_EXECUTABLE_PATH in your env.
const chromeExecutablePath =
  process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ||
  (process.env.PLAYWRIGHT_USE_SYSTEM_CHROME === "1"
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : undefined);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI ? true : false,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    ...(chromeExecutablePath ? { launchOptions: { executablePath: chromeExecutablePath } } : {}),
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(chromeExecutablePath ? { launchOptions: { executablePath: chromeExecutablePath } } : {}),
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !isCI,
    timeout: 120000,
  },
});
