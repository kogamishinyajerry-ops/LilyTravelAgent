import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const targetUrl = process.env.DREAM_URL || "http://localhost:3000/dream";
const demoRoadbook = process.env.DREAM_DEMO || "dali";
const directorLens = process.env.DREAM_LENS || "auto";
const expectedTimelineLabels = {
  dali: ["古城南门", "洱海西线", "喜洲村落", "古城收尾"],
  coast: ["海岸灯塔", "蓝色海湾", "港口街区", "日落观景台"],
};
const expectedCompositionProofs = {
  dali: ["D1 old-town beat", "D2 water hero", "D3 village detail", "D4 return beat"],
  coast: ["D1 lighthouse beat", "D2 bay hero", "D3 harbor skyline", "D4 sunset beat"],
};
const expectedLensTunings = {
  auto: "skyline 1.00x / water 1.00x / route 1.00x",
  "wide-water": "skyline 0.90x / water 1.36x / route 0.82x",
  "low-skyline": "skyline 1.34x / water 1.08x / route 1.18x",
  "isometric-atlas": "skyline 0.72x / water 0.82x / route 1.42x",
  "close-detail": "skyline 1.18x / water 0.72x / route 0.78x",
};
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

async function saveCanvasPng(page, filePath) {
  const dataUrl = await page.locator(".dream-skyline-canvas").evaluate((canvas) => canvas.toDataURL("image/png"));
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  await writeFile(filePath, Buffer.from(base64, "base64"));
}

async function readDirectorTimeline(page) {
  return page.locator(".dream-scene-timeline button").evaluateAll((buttons) =>
    buttons.map((button) => ({
      day: Number(button.querySelector("small")?.textContent?.replace(/\D/g, "") || "0"),
      label: button.querySelector("strong")?.textContent?.trim() || "",
      cue: button.querySelector("em")?.textContent?.trim() || "",
      active: button.getAttribute("aria-pressed") === "true",
    })),
  );
}

async function readCompositionProfile(page) {
  return page.locator(".dream-composition-grid span").evaluateAll((items) =>
    items.map((item) => ({
      label: item.querySelector("small")?.textContent?.trim() || "",
      value: item.querySelector("strong")?.textContent?.trim() || "",
    })),
  );
}

async function readSceneInspectorGrid(page) {
  return page.locator(".dream-scene-inspector-grid span").evaluateAll((items) =>
    items.map((item) => ({
      label: item.querySelector("small")?.textContent?.trim() || "",
      value: item.querySelector("strong")?.textContent?.trim() || "",
    })),
  );
}

async function readProofStack(page) {
  return page.locator(".dream-cinematic-proof-grid span").evaluateAll((items) =>
    items.map((item) => ({
      label: item.querySelector("small")?.textContent?.trim() || "",
      value: item.querySelector("strong")?.textContent?.trim() || "",
      status: item.className || "",
    })),
  );
}

async function readDirectorLens(page) {
  return page.locator(".dream-director-lens button").evaluateAll((buttons) =>
    buttons.map((button) => ({
      id: button.dataset.lensId || "",
      label: button.querySelector("small")?.textContent?.trim() || "",
      proof: button.querySelector("strong")?.textContent?.trim() || "",
      active: button.getAttribute("aria-pressed") === "true",
    })),
  );
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
  await page.waitForSelector(".dream-skyline-cinematic-matte", { timeout: 30_000 });

  if (demoRoadbook === "coast") {
    await page.getByRole("button", { name: /海岸/ }).first().click();
    await page.waitForTimeout(800);
  }

  if (directorLens !== "auto") {
    await page.locator(`.dream-director-lens button[data-lens-id="${directorLens}"]`).click();
    await page.waitForTimeout(500);
  }

  const lensItems = await readDirectorLens(page);
  const activeLens = lensItems.find((item) => item.active);
  assert(lensItems.length === 5, `Director Lens selector should have 5 items; got ${lensItems.length}.`);
  assert(activeLens?.id === directorLens, `Active Director Lens should be ${directorLens}; got ${activeLens?.id}.`);

  const days = [];
  for (const day of [1, 2, 3, 4]) {
    await page.getByRole("button", { name: new RegExp(`D${day}`) }).first().click();
    await page.waitForTimeout(700);

    const inspectorText = await page.locator(".dream-scene-inspector").innerText();
    const timeline = await readDirectorTimeline(page);
    const inspectorGrid = await readSceneInspectorGrid(page);
    const composition = await readCompositionProfile(page);
    const proofStack = await readProofStack(page);
    const canvasStats = await readCanvasStats(page);
    const screenshotPath = path.join(outDir, `dream-${demoRoadbook}-d${day}.png`);
    const sceneScreenshotPath = path.join(outDir, `dream-${demoRoadbook}-d${day}-scene.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    await saveCanvasPng(page, sceneScreenshotPath);

    assert(inspectorText.includes(`D${day}`), `Scene Inspector did not mention D${day}.`);
    assert(timeline.length === 4, `Director timeline should have 4 items for D${day}; got ${timeline.length}.`);
    assert(composition.length === 4, `Composition profile should have 4 items for D${day}; got ${composition.length}.`);
    assert(inspectorGrid.some((item) => item.label === "Tune"), `Scene Inspector should expose lens tuning for D${day}.`);
    assert(proofStack.length === 5, `Proof stack should have 5 items for D${day}; got ${proofStack.length}.`);
    const activeTimelineItem = timeline.find((item) => item.active);
    assert(activeTimelineItem?.day === day, `Director timeline active item should be D${day}.`);
    const expectedLabels = expectedTimelineLabels[demoRoadbook] || expectedTimelineLabels.dali;
    const expectedProofs = expectedCompositionProofs[demoRoadbook] || expectedCompositionProofs.dali;
    assert(
      timeline.map((item) => item.label).join("|") === expectedLabels.join("|"),
      `Director timeline labels did not match ${demoRoadbook}: ${timeline.map((item) => item.label).join(" / ")}`,
    );
    assert(
      proofStack.find((item) => item.label === "Composition")?.value === expectedProofs[day - 1],
      `Composition proof mismatch for D${day}: ${proofStack.find((item) => item.label === "Composition")?.value}`,
    );
    assert(
      proofStack.find((item) => item.label === "Director")?.value === activeLens?.proof,
      `Director proof mismatch for D${day}: ${proofStack.find((item) => item.label === "Director")?.value}`,
    );
    if (expectedLensTunings[directorLens]) {
      assert(
        inspectorGrid.find((item) => item.label === "Tune")?.value === expectedLensTunings[directorLens],
        `${directorLens} tuning mismatch for D${day}: ${inspectorGrid.find((item) => item.label === "Tune")?.value}`,
      );
    }
    assert(
      proofStack.filter((item) => item.status.includes("ready")).length >= 3,
      `Proof stack should have at least composition + director + landmark ready for D${day}.`,
    );
    if (demoRoadbook === "coast") {
      assert(inspectorText.includes("海岸海岛"), `Coastal Scene Inspector did not activate for D${day}.`);
    }
    assert(canvasStats.width > 0 && canvasStats.height > 0, `D${day} canvas has invalid dimensions.`);
    assert(canvasStats.lit > 0, `D${day} canvas appears blank.`);

    days.push({
      day,
      inspectorText,
      timeline,
      inspectorGrid,
      composition,
      proofStack,
      directorLens: activeLens,
      canvasStats,
      screenshotPath,
      sceneScreenshotPath,
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
    directorLens,
    activeLens,
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
  const clipNotesPath = path.join(outDir, "clip-notes.md");
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(htmlPath, buildHtmlReport(summary));
  await writeFile(clipNotesPath, buildClipNotes(summary));

  assert(consoleMessages.length === 0, `Unexpected browser console messages:\n${consoleMessages.join("\n")}`);

  console.log(`Dream visual QA passed: ${summaryPath}`);
  console.log(`Dream visual QA gallery: ${htmlPath}`);
  console.log(`Dream visual QA clip notes: ${clipNotesPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function buildHtmlReport(summary) {
  const dayCards = summary.days
    .map((day) => {
      const shotLine = day.inspectorText.split("\n").find((line) => /^D\d/.test(line)) || `D${day.day}`;
      const timelineItems = day.timeline
        .map(
          (item) => `
            <li class="${item.active ? "active" : ""}">
              <span>D${item.day}</span>
              <strong>${escapeHtml(item.label)}</strong>
              <small>${escapeHtml(item.cue)}</small>
            </li>`,
        )
        .join("");
      const compositionItems = day.composition
        .map(
          (item) => `
            <li>
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.value)}</strong>
            </li>`,
        )
        .join("");
      const inspectorItems = day.inspectorGrid
        .map(
          (item) => `
            <li>
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.value)}</strong>
            </li>`,
        )
        .join("");
      const proofItems = day.proofStack
        .map(
          (item) => `
            <li class="${escapeHtml(item.status)}">
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.value)}</strong>
            </li>`,
        )
        .join("");
      const primaryImage = day.sceneScreenshotPath || day.screenshotPath;
      return `
        <article class="day-card">
          <img src="${escapeHtml(path.basename(primaryImage))}" alt="D${day.day} /dream cinematic scene crop" />
          <div class="day-body">
            <p class="eyebrow">D${day.day} Visual Check</p>
            <h2>${escapeHtml(shotLine)}</h2>
            <p class="asset-pair">Scene crop: ${escapeHtml(path.basename(primaryImage))} · Page: ${escapeHtml(path.basename(day.screenshotPath))}</p>
            <pre>${escapeHtml(day.inspectorText)}</pre>
            <ul class="timeline">${timelineItems}</ul>
            <ul class="proof-list">${inspectorItems}</ul>
            <ul class="proof-list">${compositionItems}</ul>
            <ul class="proof-list">${proofItems}</ul>
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

      .asset-pair {
        margin-top: 8px;
        color: var(--muted);
        font-size: 0.76rem;
        font-weight: 800;
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

      .timeline {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin: 0 0 12px;
        padding: 0;
        list-style: none;
      }

      .timeline li {
        display: grid;
        gap: 2px;
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 8px;
        background: rgba(255, 255, 255, 0.58);
      }

      .proof-list {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin: 0 0 12px;
        padding: 0;
        list-style: none;
      }

      .proof-list li {
        display: grid;
        gap: 2px;
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 8px;
        background: rgba(247, 243, 236, 0.68);
      }

      .proof-list li.ready {
        background: rgba(207, 234, 220, 0.64);
      }

      .timeline li.active {
        color: #fff;
        background: linear-gradient(135deg, #4b8589, #cc8a5f);
      }

      .timeline span,
      .timeline strong,
      .timeline small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .timeline span,
      .timeline small {
        color: inherit;
        font-size: 0.72rem;
        font-weight: 900;
        opacity: 0.76;
      }

      .proof-list span {
        color: var(--muted);
        font-size: 0.7rem;
        font-weight: 900;
      }

      .proof-list strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
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
          lens: ${escapeHtml(summary.activeLens?.proof || summary.directorLens)}<br />
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

function buildClipNotes(summary) {
  const demoLabel = summary.demoRoadbook === "coast" ? "海岸 / Coastal preset" : "大理 / Dali preset";
  const routeLine = summary.days
    .map((day) => {
      const active = day.timeline.find((item) => item.active) || day.timeline[0];
      return `D${day.day} ${active?.label || "未命名"}(${active?.cue || "无 cue"})`;
    })
    .join(" -> ");
  const dayNotes = summary.days
    .map((day) => {
      const active = day.timeline.find((item) => item.active) || day.timeline[0];
      return [
        `## D${day.day} ${active?.label || "未命名镜头"}`,
        ``,
        `- Screenshot: ${path.basename(day.screenshotPath)}`,
        `- 3D scene crop: ${path.basename(day.sceneScreenshotPath || day.screenshotPath)}`,
        `- Director cue: ${active?.cue || "无 cue"}`,
        `- Director Lens: ${day.directorLens?.proof || "auto"}`,
        `- Lens tuning: ${day.inspectorGrid.find((item) => item.label === "Tune")?.value || "无"}`,
        `- Composition proof: ${day.proofStack.find((item) => item.label === "Composition")?.value || "无"}`,
        `- Proof stack: ${day.proofStack.map((item) => `${item.label}=${item.value}`).join(" / ")}`,
        `- Canvas lit pixels: ${day.canvasStats.lit}`,
        `- Canvas checksum: ${day.canvasStats.checksum}`,
        `- Voiceover prompt: 展示 D${day.day} 如何从路书文本变成 ${active?.label || "当天镜头"}，重点讲 ${active?.cue || "视觉线索"}。`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    `# /dream Visual QA Clip Notes`,
    ``,
    `- Demo mode: ${demoLabel}`,
    `- Target URL: ${summary.targetUrl}`,
    `- Created at: ${summary.createdAt}`,
    `- Viewport: ${summary.viewport.width}x${summary.viewport.height}`,
    `- Director Lens: ${summary.activeLens?.label || summary.directorLens} / ${summary.activeLens?.proof || "auto"}`,
    `- Route director line: ${routeLine}`,
    `- Motion evidence: D${summary.motion.day} checksum ${summary.motion.changed ? "changed" : "did not change"} (${summary.motion.start.checksum} -> ${summary.motion.end.checksum})`,
    ``,
    `## Short Voiceover`,
    ``,
    summary.demoRoadbook === "coast"
      ? `我用海岸样例检查动态路书的导演轨道：D1 灯塔、D2 海湾、D3 港口、D4 日落观景台。自动 QA 不只截图，还会验证每一天的视觉 cue 和微动证据。`
      : `我用大理样例检查动态路书的导演轨道：古城、洱海、喜洲、返程收尾。自动 QA 会把截图、Scene Inspector、D1-D4 视觉 cue 和微动证据都整理出来。`,
    ``,
    dayNotes,
    ``,
  ].join("\n");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
