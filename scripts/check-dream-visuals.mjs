import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const targetUrl = process.env.DREAM_URL || "http://localhost:3000/dream";
const demoRoadbook = process.env.DREAM_DEMO || "dali";
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

  if (demoRoadbook === "coast") {
    await page.getByRole("button", { name: /海岸/ }).first().click();
    await page.waitForTimeout(800);
  }

  const days = [];
  for (const day of [1, 2, 3, 4]) {
    await page.getByRole("button", { name: new RegExp(`D${day}`) }).first().click();
    await page.waitForTimeout(700);

    const inspectorText = await page.locator(".dream-scene-inspector").innerText();
    const canvasStats = await readCanvasStats(page);
    const screenshotPath = path.join(outDir, `dream-${demoRoadbook}-d${day}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    assert(inspectorText.includes(`D${day}`), `Scene Inspector did not mention D${day}.`);
    if (demoRoadbook === "coast") {
      assert(inspectorText.includes("海岸海岛"), `Coastal Scene Inspector did not activate for D${day}.`);
    }
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
    demoRoadbook,
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
  const htmlPath = path.join(outDir, "index.html");
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(htmlPath, buildHtmlReport(summary));

  assert(consoleMessages.length === 0, `Unexpected browser console messages:\n${consoleMessages.join("\n")}`);

  console.log(`Dream visual QA passed: ${summaryPath}`);
  console.log(`Dream visual QA gallery: ${htmlPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function buildHtmlReport(summary) {
  const dayCards = summary.days
    .map((day) => {
      const shotLine = day.inspectorText.split("\n").find((line) => /^D\d/.test(line)) || `D${day.day}`;
      return `
        <article class="day-card">
          <img src="${escapeHtml(path.basename(day.screenshotPath))}" alt="D${day.day} /dream screenshot" />
          <div class="day-body">
            <p class="eyebrow">D${day.day} Visual Check</p>
            <h2>${escapeHtml(shotLine)}</h2>
            <pre>${escapeHtml(day.inspectorText)}</pre>
            <dl>
              <div><dt>lit</dt><dd>${day.canvasStats.lit}</dd></div>
              <div><dt>varied</dt><dd>${day.canvasStats.varied}</dd></div>
              <div><dt>checksum</dt><dd>${day.canvasStats.checksum}</dd></div>
            </dl>
          </div>
        </article>`;
    })
    .join("");

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>LilyTravelAgent /dream Visual QA</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #25303a;
        --muted: #6f7b86;
        --paper: #f7f3ec;
        --line: rgba(45, 63, 76, 0.14);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        color: var(--ink);
        background: #e9edf1;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      main {
        width: min(1440px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 28px 0 40px;
      }

      header {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 18px;
      }

      h1,
      h2,
      p {
        margin: 0;
      }

      h1 {
        font-size: clamp(1.9rem, 3vw, 3.2rem);
        line-height: 0.95;
      }

      .meta {
        color: var(--muted);
        font-size: 0.9rem;
        font-weight: 700;
        text-align: right;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }

      .day-card,
      .motion-card {
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.72);
        box-shadow: 0 18px 50px rgba(47, 60, 70, 0.12);
      }

      .day-card img {
        display: block;
        width: 100%;
        aspect-ratio: 16 / 10;
        object-fit: cover;
        background: #dce4e8;
      }

      .day-body,
      .motion-card {
        padding: 16px;
      }

      .eyebrow {
        color: var(--muted);
        font-size: 0.72rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h2 {
        margin-top: 5px;
        font-size: 1.3rem;
      }

      pre {
        overflow: auto;
        margin: 12px 0;
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 10px;
        color: #35414a;
        background: var(--paper);
        font-size: 0.78rem;
        line-height: 1.45;
        white-space: pre-wrap;
      }

      dl {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin: 0;
      }

      dl div {
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 8px;
        background: rgba(255, 255, 255, 0.64);
      }

      dt {
        color: var(--muted);
        font-size: 0.7rem;
        font-weight: 900;
        text-transform: uppercase;
      }

      dd {
        margin: 3px 0 0;
        font-weight: 900;
      }

      .motion-card {
        margin-top: 16px;
      }

      .motion-ok {
        color: #18724d;
      }

      @media (max-width: 900px) {
        header,
        .grid {
          display: block;
        }

        .meta {
          margin-top: 10px;
          text-align: left;
        }

        .day-card + .day-card {
          margin-top: 14px;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <p class="eyebrow">LilyTravelAgent Visual QA</p>
          <h1>/dream D1-D4 Review</h1>
        </div>
        <p class="meta">
          demo: ${escapeHtml(summary.demoRoadbook)}<br />
          ${escapeHtml(summary.createdAt)}<br />
          ${escapeHtml(summary.targetUrl)}
        </p>
      </header>
      <section class="grid">${dayCards}</section>
      <section class="motion-card">
        <p class="eyebrow">Motion Evidence</p>
        <h2 class="${summary.motion.changed ? "motion-ok" : ""}">
          D${summary.motion.day} checksum ${summary.motion.changed ? "changed" : "did not change"}
        </h2>
        <pre>${escapeHtml(JSON.stringify(summary.motion, null, 2))}</pre>
      </section>
    </main>
  </body>
</html>
`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
