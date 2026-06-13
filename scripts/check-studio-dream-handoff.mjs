import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.HANDOFF_BASE_URL || process.env.RECORDING_SUITE_BASE_URL || "http://localhost:3000";
const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = process.env.HANDOFF_OUT_DIR || path.join("recordings", "handoff-checks", runStamp);
const systemChromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const executablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE || (existsSync(systemChromePath) ? systemChromePath : undefined);

const demos = [
  { id: "dali", destination: "云南大理", studioStatus: "云南大理 本地演示", dreamBridge: "云南大理 → Studio" },
  { id: "coast", destination: "三亚海岛", studioStatus: "三亚海岛 本地演示", dreamBridge: "三亚海岛 → Studio" },
];

function resolveUrl(pathname) {
  return new URL(pathname, baseUrl).toString();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  await assertReachable(resolveUrl("/studio"));
  await assertReachable(resolveUrl("/dream"));
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const consoleMessages = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleMessages.push(`${message.type()}: ${message.text()}`);
    }
  });

  const captures = [];
  for (const demo of demos) {
    const studioUrl = resolveUrl(`/studio?demo=${demo.id}`);
    await page.goto(studioUrl, { waitUntil: "networkidle" });
    await page.waitForSelector(`input[value="${demo.destination}"]`, { timeout: 30_000 });

    const studioText = await page.locator("body").innerText();
    const studioBridgeText = await page.locator('[aria-label="Demo Bridge"]').innerText();
    const dreamHref = await page.locator('[aria-label="Demo Bridge"] a').getAttribute("href");
    assert(studioText.includes(demo.studioStatus), `${demo.id} Studio status missing.`);
    assert(studioBridgeText.includes(`${demo.destination} → Dream`), `${demo.id} Demo Bridge mismatch: ${studioBridgeText}`);
    assert(dreamHref === `/dream?demo=${demo.id}`, `${demo.id} dream href mismatch: ${dreamHref}`);

    const studioScreenshot = path.join(outDir, `studio-${demo.id}-bridge.png`);
    await page.screenshot({ path: studioScreenshot, fullPage: false });

    const dreamUrl = resolveUrl(dreamHref);
    await page.goto(dreamUrl, { waitUntil: "networkidle" });
    await page.waitForSelector(`input[value="${demo.destination}"]`, { timeout: 30_000 });

    const dreamBridgeText = await page.locator('[aria-label="Studio Bridge"]').innerText();
    const studioHref = await page.locator('[aria-label="Studio Bridge"] a').getAttribute("href");
    assert(dreamBridgeText.includes(demo.dreamBridge), `${demo.id} Studio Bridge mismatch: ${dreamBridgeText}`);
    assert(studioHref === `/studio?demo=${demo.id}`, `${demo.id} studio href mismatch: ${studioHref}`);

    const dreamScreenshot = path.join(outDir, `dream-${demo.id}-bridge.png`);
    await page.screenshot({ path: dreamScreenshot, fullPage: false });

    await page.goto(resolveUrl(studioHref), { waitUntil: "networkidle" });
    await page.waitForSelector(`input[value="${demo.destination}"]`, { timeout: 30_000 });

    captures.push({
      id: demo.id,
      destination: demo.destination,
      studioUrl,
      dreamUrl,
      dreamHref,
      studioHref,
      studioScreenshot,
      dreamScreenshot,
    });
  }

  await browser.close();

  const summary = {
    baseUrl,
    createdAt: new Date().toISOString(),
    outDir,
    captures,
    consoleMessages,
  };

  const summaryPath = path.join(outDir, "summary.json");
  const notesPath = path.join(outDir, "clip-notes.md");
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(notesPath, buildClipNotes(summary));

  assert(consoleMessages.length === 0, `Unexpected browser console messages:\n${consoleMessages.join("\n")}`);

  console.log(`Studio-Dream handoff QA passed: ${summaryPath}`);
  console.log(`Studio-Dream handoff clip notes: ${notesPath}`);
}

async function assertReachable(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot reach ${url}. Start the local app first with npm run dev, or set HANDOFF_BASE_URL. Detail: ${detail}`);
  } finally {
    clearTimeout(timeout);
  }
}

function buildClipNotes(summary) {
  const lines = [
    "# Studio-Dream Handoff Clip Notes",
    "",
    `Created: ${summary.createdAt}`,
    `Base URL: ${summary.baseUrl}`,
    "",
    "## Captures",
    "",
  ];

  for (const capture of summary.captures) {
    lines.push(
      `- ${capture.id}: ${capture.destination}`,
      `  - Studio: ${capture.studioUrl}`,
      `  - Dream: ${capture.dreamUrl}`,
      `  - Studio screenshot: ${path.basename(capture.studioScreenshot)}`,
      `  - Dream screenshot: ${path.basename(capture.dreamScreenshot)}`,
    );
  }

  lines.push("", "## Voiceover", "", "- Studio explains the Agent workflow.", "- Dream shows the product-facing cinematic roadbook.", "- Bridge cards keep the route stable across both screens.", "");
  return `${lines.join("\n")}\n`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
