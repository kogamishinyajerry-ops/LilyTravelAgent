import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const targetUrl = process.env.DREAM_URL || "http://localhost:3000/dream";
const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = process.env.DREAM_VISUAL_OUT_DIR || path.join("recordings", "visual-checks", runStamp);
const systemChromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const executablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE || (existsSync(systemChromePath) ? systemChromePath : undefined);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readCanvasStats(page) {
  return page.locator("canvas").first().evaluate((canvas) => {
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) {
      return { width: canvas.width, height: canvas.height, checksum: -1, lit: -1, varied: -1 };
    }

    const width = Math.min(120, canvas.width);
    const height = Math.min(120, canvas.height);
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(
      Math.floor((canvas.width - width) / 2),
      Math.floor((canvas.height - height) / 2),
      width,
      height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels,
    );

    let checksum = 0;
    let lit = 0;
    let varied = 0;
    let previous = -1;

    for (let index = 0; index < pixels.length; index += 24) {
      const brightness = pixels[index] + pixels[index + 1] + pixels[index + 2];
      checksum = (checksum + brightness * (index + 1)) % 1000000007;
      if (brightness > 42) {
        lit += 1;
      }
      if (previous >= 0 && Math.abs(brightness - previous) > 10) {
        varied += 1;
      }
      previous = brightness;
    }

    return { width: canvas.width, height: canvas.height, checksum, lit, varied };
  });
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath,
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const consoleMessages = [];

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleMessages.push(`${message.type()}: ${message.text()}`);
    }
  });

  await page.goto(targetUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas", { timeout: 30_000 });
  await page.waitForSelector(".dream-scene-inspector", { timeout: 30_000 });

  const days = [];
  for (const day of [1, 2, 3, 4]) {
    await page.getByRole("button", { name: new RegExp(`D${day}`) }).first().click();
    await page.waitForTimeout(700);

    const inspectorText = await page.locator(".dream-scene-inspector").innerText();
    const canvasStats = await readCanvasStats(page);
    const screenshotPath = path.join(outDir, `dream-d${day}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    assert(inspectorText.includes(`D${day}`), `Scene Inspector did not mention D${day}.`);
    assert(canvasStats.width > 0 && canvasStats.height > 0, `D${day} canvas has invalid dimensions.`);
    assert(canvasStats.lit > 0, `D${day} canvas appears blank.`);

    days.push({
      day,
      inspectorText,
      canvasStats,
      screenshotPath,
    });
  }

  await page.getByRole("button", { name: /D2/ }).first().click();
  await page.waitForTimeout(500);
  const motionStart = await readCanvasStats(page);
  await page.waitForTimeout(1400);
  const motionEnd = await readCanvasStats(page);
  const motionChanged = motionStart.checksum !== motionEnd.checksum;
  assert(motionChanged, "D2 canvas checksum did not change over time; micro-motion may be frozen.");

  await browser.close();

  const summary = {
    targetUrl,
    createdAt: new Date().toISOString(),
    viewport: { width: 1280, height: 800 },
    outDir,
    days,
    motion: {
      day: 2,
      start: motionStart,
      end: motionEnd,
      changed: motionChanged,
    },
    consoleMessages,
  };
  const summaryPath = path.join(outDir, "summary.json");
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

  assert(consoleMessages.length === 0, `Unexpected browser console messages:\n${consoleMessages.join("\n")}`);

  console.log(`Dream visual QA passed: ${summaryPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
