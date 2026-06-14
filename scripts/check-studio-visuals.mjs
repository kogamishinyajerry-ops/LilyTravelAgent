import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const targetUrl = process.env.STUDIO_URL || "http://localhost:3000/studio";
const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = process.env.STUDIO_VISUAL_OUT_DIR || path.join("recordings", "studio-checks", runStamp);
const systemChromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const executablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE || (existsSync(systemChromePath) ? systemChromePath : undefined);
const proofStoryScriptPath = "docs/recording/proof-story-demo-script.md";
const proofStoryScriptCue = "证据时间线 → 四行讲解稿预览 → 复制讲解稿";

const demos = [
  {
    id: "dali",
    button: /大理/,
    title: "大理 4 天松弛路书",
    destination: "云南大理",
    status: "云南大理 本地演示",
  },
  {
    id: "coast",
    button: /海岸/,
    title: "三亚海岸 4 天梦境路书",
    destination: "三亚海岛",
    status: "三亚海岛 本地演示",
  },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath,
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const consoleMessages = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleMessages.push(`${message.type()}: ${message.text()}`);
    }
  });

  await page.goto(targetUrl, { waitUntil: "networkidle" });
  await page.waitForSelector(".studio-page", { timeout: 30_000 });

  const captures = [];
  for (const demo of demos) {
    await page.getByRole("button", { name: demo.button }).first().click();
    await page.waitForTimeout(500);

    const title = await page.locator(".studio-cover h2").innerText();
    const destination = await page.getByLabel("目的地").inputValue();
    const statusText = (await page.locator(".studio-top-actions span").allInnerTexts()).join(" / ");
    const activeDemoText = await page.locator(".studio-demo-switch button.active").innerText();
    const screenshotPath = path.join(outDir, `studio-${demo.id}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    assert(title === demo.title, `${demo.id} title mismatch: ${title}`);
    assert(destination === demo.destination, `${demo.id} destination mismatch: ${destination}`);
    assert(statusText.includes(demo.status), `${demo.id} status did not include ${demo.status}`);
    assert(activeDemoText.includes(demo.id === "dali" ? "大理" : "海岸"), `${demo.id} active switch mismatch`);

    captures.push({
      id: demo.id,
      title,
      destination,
      statusText,
      activeDemoText,
      screenshotPath,
    });
  }

  const { proofPlayback, scriptMaterial } = await captureProofPlayback(page);

  await browser.close();

  const summary = {
    targetUrl,
    createdAt: new Date().toISOString(),
    viewport: { width: 1280, height: 720 },
    outDir,
    captures,
    proofPlayback,
    scriptMaterial,
    consoleMessages,
  };
  const summaryPath = path.join(outDir, "summary.json");
  const htmlPath = path.join(outDir, "index.html");
  const clipNotesPath = path.join(outDir, "clip-notes.md");
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(htmlPath, buildHtmlReport(summary));
  await writeFile(clipNotesPath, buildClipNotes(summary));

  assert(consoleMessages.length === 0, `Unexpected browser console messages:\n${consoleMessages.join("\n")}`);

  console.log(`Studio visual QA passed: ${summaryPath}`);
  console.log(`Studio visual QA gallery: ${htmlPath}`);
  console.log(`Studio visual QA clip notes: ${clipNotesPath}`);
}

async function captureProofPlayback(page) {
  await page.getByRole("button", { name: /脚本模式/ }).click();
  await page.waitForSelector('[aria-label="录屏证据清单"]', { timeout: 30_000 });

  const initialCues = await readProofChecklist(page);
  assert(initialCues.some((cue) => cue.label === "Suite Run"), "Studio proof checklist should include Suite Run.");
  assert(initialCues.some((cue) => cue.label === "Final Handoff"), "Studio proof checklist should include Final Handoff.");

  const checklist = page.locator('[aria-label="录屏证据清单"]');
  await checklist.getByRole("button", { name: "播放证据线" }).click();
  await page.waitForFunction(
    () => document.querySelector('[aria-label="录屏证据清单"] [aria-current="step"]')?.textContent?.includes("Final Handoff"),
    null,
    { timeout: 15_000 },
  );

  const finalActiveCue = (await readProofChecklist(page)).find((cue) => cue.active) || null;
  assert(finalActiveCue?.label === "Final Handoff", `Studio proof playback should end on Final Handoff, got ${finalActiveCue?.label || "none"}.`);

  const screenshotPath = path.join(outDir, "studio-suite-run-proof.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  const buttonTextAfterPlayback = await checklist.locator("button").innerText();
  assert(buttonTextAfterPlayback.includes("播放证据线"), `Proof playback button did not reset: ${buttonTextAfterPlayback}`);

  const scriptMaterial = await captureProofStoryScriptMaterial(page);

  return {
    proofPlayback: {
      initialCues,
      finalActiveCue,
      buttonTextAfterPlayback,
      screenshotPath,
    },
    scriptMaterial,
  };
}

async function captureProofStoryScriptMaterial(page) {
  const card = page.getByLabel("Proof Story 脚本素材");
  await card.waitFor({ state: "visible", timeout: 30_000 });

  const text = ((await card.textContent()) || "").replace(/\s+/g, " ").trim();
  const buttonText = await card.getByRole("button", { name: "复制脚本路径" }).innerText();
  const handoffPreview = await card.getByLabel("Proof Story Handoff 预览").innerText();
  const completeLine = await card.getByLabel("Proof Story Complete 状态").innerText();
  const completeBundleLine = await card.getByLabel("Proof Story Complete Bundle 预览").innerText();
  const bundleChainLine = await card.getByLabel("Proof Story Bundle Chain 状态").innerText();
  const proofChainSummaryLine = await card.getByLabel("Proof Chain Summary 预览").innerText();
  const handoffCopyButton = card.getByRole("button", { name: "复制 Proof Story Handoff" });
  const completeBundleCopyButton = card.getByRole("button", { name: "复制 Proof Story Complete Bundle" });
  const bundleChainCopyButton = card.getByRole("button", { name: "复制 Proof Story Bundle Chain" });
  const proofChainSummaryCopyButton = card.getByRole("button", { name: "复制 Proof Chain Summary" });
  const finalDeliveryCue = page.getByLabel("脚本模式最终交付摘要");
  const finalDeliveryCopyButton = page.getByRole("button", { name: "复制脚本模式最终交付摘要" });
  const finalDeliveryNotesBadge = page.getByLabel("脚本模式后期 notes 状态");
  const finalDeliverySummaryLine = await finalDeliveryCue.locator("p").innerText();
  const finalDeliveryNotesBadgeBeforeCopy = await finalDeliveryNotesBadge.innerText();
  assert(text.includes(proofStoryScriptPath), `Proof Story script card did not include ${proofStoryScriptPath}: ${text}`);
  assert(text.includes(proofStoryScriptCue), `Proof Story script card did not include cue text: ${text}`);
  assert(handoffPreview.includes("Proof Story Handoff"), `Proof Story script card did not include handoff preview: ${handoffPreview}`);
  assert(
    completeLine.includes("Proof Story Complete") || completeLine.includes("Proof Story Pending"),
    `Proof Story script card did not include complete strip: ${completeLine}`,
  );
  assert(completeBundleLine.includes("Proof Story Complete Bundle"), `Proof Story script card did not include Complete Bundle: ${completeBundleLine}`);
  assert(bundleChainLine.includes("Proof Story Bundle Chain"), `Proof Story script card did not include Bundle Chain: ${bundleChainLine}`);
  assert(proofChainSummaryLine.includes("Proof Chain Summary"), `Proof Story script card did not include Proof Chain Summary: ${proofChainSummaryLine}`);
  assert(finalDeliverySummaryLine.includes("最终交付摘要"), `Final delivery summary cue missing final summary line: ${finalDeliverySummaryLine}`);
  assert(
    /后期 notes 待(复制|补齐)/.test(finalDeliveryNotesBadgeBeforeCopy),
    `Final delivery notes badge did not start in a pending state: ${finalDeliveryNotesBadgeBeforeCopy}`,
  );

  await handoffCopyButton.click();
  await page.waitForFunction(
    () => {
      const button = document.querySelector('[aria-label="复制 Proof Story Handoff"]');
      return button?.textContent?.includes("已复制") || button?.textContent?.includes("手动");
    },
    null,
    { timeout: 5_000 },
  );
  const handoffCopyButtonText = await handoffCopyButton.innerText();
  const handoffCopyState = handoffCopyButtonText.includes("已复制") ? "Handoff 已复制" : `Handoff ${handoffCopyButtonText.trim() || "手动"}`;
  assert(
    handoffCopyState === "Handoff 已复制" || handoffCopyState.includes("手动"),
    `Proof Story handoff copy did not reach copied or fallback state: ${handoffCopyButtonText}`,
  );

  await completeBundleCopyButton.click();
  await page.waitForFunction(
    () => {
      const button = document.querySelector('[aria-label="复制 Proof Story Complete Bundle"]');
      return button?.textContent?.includes("已复制") || button?.textContent?.includes("手动");
    },
    null,
    { timeout: 5_000 },
  );
  const completeBundleCopyButtonText = await completeBundleCopyButton.innerText();
  const completeBundleCopyState = completeBundleCopyButtonText.includes("已复制")
    ? "Complete Bundle 已复制"
    : `Complete Bundle ${completeBundleCopyButtonText.trim() || "手动"}`;
  assert(
    completeBundleCopyState === "Complete Bundle 已复制" || completeBundleCopyState.includes("手动"),
    `Proof Story Complete Bundle copy did not reach copied or fallback state: ${completeBundleCopyButtonText}`,
  );

  await bundleChainCopyButton.click();
  await page.waitForFunction(
    () => {
      const button = document.querySelector('[aria-label="复制 Proof Story Bundle Chain"]');
      return button?.textContent?.includes("已复制") || button?.textContent?.includes("手动");
    },
    null,
    { timeout: 5_000 },
  );
  const bundleChainCopyButtonText = await bundleChainCopyButton.innerText();
  const bundleChainCopyState = bundleChainCopyButtonText.includes("已复制")
    ? "Bundle Chain 已复制"
    : `Bundle Chain ${bundleChainCopyButtonText.trim() || "手动"}`;
  assert(
    bundleChainCopyState === "Bundle Chain 已复制" || bundleChainCopyState.includes("手动"),
    `Proof Story Bundle Chain copy did not reach copied or fallback state: ${bundleChainCopyButtonText}`,
  );

  await proofChainSummaryCopyButton.click();
  await page.waitForFunction(
    () => {
      const button = document.querySelector('[aria-label="复制 Proof Chain Summary"]');
      return button?.textContent?.includes("已复制") || button?.textContent?.includes("手动");
    },
    null,
    { timeout: 5_000 },
  );
  const proofChainSummaryCopyButtonText = await proofChainSummaryCopyButton.innerText();
  const proofChainSummaryCopyState = proofChainSummaryCopyButtonText.includes("已复制")
    ? "Proof Chain Summary 已复制"
    : `Proof Chain Summary ${proofChainSummaryCopyButtonText.trim() || "手动"}`;
  assert(
    proofChainSummaryCopyState === "Proof Chain Summary 已复制" || proofChainSummaryCopyState.includes("手动"),
    `Proof Chain Summary copy did not reach copied or fallback state: ${proofChainSummaryCopyButtonText}`,
  );

  await finalDeliveryCopyButton.click();
  await page.waitForFunction(
    () => document.querySelector('[aria-label="脚本模式后期 notes 状态"]')?.textContent?.includes("已复制到后期 notes"),
    null,
    { timeout: 5_000 },
  );
  const finalDeliveryCopyButtonText = await finalDeliveryCopyButton.innerText();
  const finalDeliveryNotesBadgeAfterCopy = await finalDeliveryNotesBadge.innerText();
  const finalDeliveryCopyState = finalDeliveryCopyButtonText.includes("已复制")
    ? "Final Handoff 已复制"
    : `Final Handoff ${finalDeliveryCopyButtonText.trim() || "手动"}`;
  assert(finalDeliveryCopyState === "Final Handoff 已复制", `Final Handoff copy did not reach copied state: ${finalDeliveryCopyButtonText}`);
  assert(
    finalDeliveryNotesBadgeAfterCopy === "已复制到后期 notes",
    `Final delivery notes badge did not reach copied state: ${finalDeliveryNotesBadgeAfterCopy}`,
  );

  const screenshotPath = path.join(outDir, "studio-proof-story-script-material.png");
  await card.screenshot({ path: screenshotPath });

  return {
    visible: true,
    scriptPath: proofStoryScriptPath,
    cue: proofStoryScriptCue,
    buttonText,
    handoffPreview,
    handoffCopyState,
    completeLine,
    completeBundleLine,
    completeBundleCopyState,
    bundleChainLine,
    bundleChainCopyState,
    proofChainSummaryLine,
    proofChainSummaryCopyState,
    finalDeliverySummaryLine,
    finalDeliveryCopyState,
    finalDeliveryNotesBadgeBeforeCopy,
    finalDeliveryNotesBadgeAfterCopy,
    text,
    screenshotPath,
  };
}

async function readProofChecklist(page) {
  return page.locator(".studio-proof-checklist-item").evaluateAll((items) =>
    items.map((item) => ({
      label: item.querySelector("span")?.textContent?.trim() || "",
      state: item.querySelector("strong")?.textContent?.trim() || "",
      detail: item.querySelector("a, p")?.textContent?.trim() || "",
      cue: item.querySelector("em")?.textContent?.trim() || "",
      active: item.getAttribute("aria-current") === "step",
    })),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function buildHtmlReport(summary) {
  const cards = summary.captures
    .map(
      (capture) => `
        <article>
          <img src="${escapeHtml(path.basename(capture.screenshotPath))}" alt="${escapeHtml(capture.id)} studio screenshot" />
          <div>
            <p>${escapeHtml(capture.id)} demo</p>
            <h2>${escapeHtml(capture.title)}</h2>
            <dl>
              <div><dt>destination</dt><dd>${escapeHtml(capture.destination)}</dd></div>
              <div><dt>status</dt><dd>${escapeHtml(capture.statusText)}</dd></div>
            </dl>
          </div>
        </article>`,
    )
    .join("");
  const proof = summary.proofPlayback
    ? `
      <section class="proof">
        <img src="${escapeHtml(path.basename(summary.proofPlayback.screenshotPath))}" alt="Studio proof playback final state" />
        <div>
          <p>proof playback</p>
          <h2>${escapeHtml(summary.proofPlayback.finalActiveCue?.label || "Proof cue")}</h2>
          <dl>
            <div><dt>state</dt><dd>${escapeHtml(summary.proofPlayback.finalActiveCue?.state || "")}</dd></div>
            <div><dt>detail</dt><dd>${escapeHtml(summary.proofPlayback.finalActiveCue?.detail || "")}</dd></div>
            <div><dt>button</dt><dd>${escapeHtml(summary.proofPlayback.buttonTextAfterPlayback)}</dd></div>
          </dl>
        </div>
      </section>`
    : "";
  const scriptMaterial = summary.scriptMaterial
    ? `
      <section class="proof script-material">
        <img src="${escapeHtml(path.basename(summary.scriptMaterial.screenshotPath))}" alt="Proof Story script material card" />
        <div>
          <p>script material</p>
          <h2>Proof Story Demo Script</h2>
          <dl>
            <div><dt>path</dt><dd>${escapeHtml(summary.scriptMaterial.scriptPath)}</dd></div>
            <div><dt>cue</dt><dd>${escapeHtml(summary.scriptMaterial.cue)}</dd></div>
            <div><dt>button</dt><dd>${escapeHtml(summary.scriptMaterial.buttonText)}</dd></div>
            <div><dt>handoff</dt><dd>${escapeHtml(summary.scriptMaterial.handoffCopyState || "")}</dd></div>
            <div><dt>complete</dt><dd>${escapeHtml(summary.scriptMaterial.completeLine || "")}</dd></div>
            <div><dt>bundle line</dt><dd>${escapeHtml(summary.scriptMaterial.completeBundleLine || "")}</dd></div>
            <div><dt>bundle</dt><dd>${escapeHtml(summary.scriptMaterial.completeBundleCopyState || "")}</dd></div>
            <div><dt>bundle chain</dt><dd>${escapeHtml(summary.scriptMaterial.bundleChainLine || "")}</dd></div>
            <div><dt>chain copy</dt><dd>${escapeHtml(summary.scriptMaterial.bundleChainCopyState || "")}</dd></div>
            <div><dt>proof chain summary</dt><dd>${escapeHtml(summary.scriptMaterial.proofChainSummaryLine || "")}</dd></div>
            <div><dt>summary copy</dt><dd>${escapeHtml(summary.scriptMaterial.proofChainSummaryCopyState || "")}</dd></div>
            <div><dt>final handoff</dt><dd>${escapeHtml(summary.scriptMaterial.finalDeliverySummaryLine || "")}</dd></div>
            <div><dt>final copy</dt><dd>${escapeHtml(summary.scriptMaterial.finalDeliveryCopyState || "")}</dd></div>
            <div><dt>notes badge before</dt><dd>${escapeHtml(summary.scriptMaterial.finalDeliveryNotesBadgeBeforeCopy || "")}</dd></div>
            <div><dt>notes badge after</dt><dd>${escapeHtml(summary.scriptMaterial.finalDeliveryNotesBadgeAfterCopy || "")}</dd></div>
          </dl>
        </div>
      </section>`
    : "";

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>LilyTravelAgent /studio Visual QA</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #26342e;
        background: #e7e9e3;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(1480px, calc(100vw - 32px));
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
      h1, h2, p { margin: 0; }
      h1 { font-size: clamp(1.9rem, 3vw, 3.2rem); }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }
      article {
        overflow: hidden;
        border: 1px solid rgba(40, 58, 48, 0.14);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.72);
        box-shadow: 0 18px 50px rgba(47, 60, 70, 0.12);
      }
      img {
        display: block;
        width: 100%;
        aspect-ratio: 16 / 9;
        object-fit: cover;
      }
      article > div { padding: 16px; }
      .proof {
        overflow: hidden;
        display: grid;
        grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.7fr);
        gap: 0;
        margin-top: 16px;
        border: 1px solid rgba(83, 96, 173, 0.24);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.76);
        box-shadow: 0 18px 50px rgba(47, 60, 70, 0.12);
      }
      .proof > div { padding: 18px; }
      article p {
        color: #63806e;
        font-size: 0.72rem;
        font-weight: 900;
        text-transform: uppercase;
      }
      h2 {
        margin-top: 5px;
        font-size: 1.25rem;
      }
      dl {
        display: grid;
        gap: 8px;
        margin: 12px 0 0;
      }
      dl div {
        border: 1px solid rgba(40, 58, 48, 0.14);
        border-radius: 8px;
        padding: 8px;
        background: rgba(255, 255, 255, 0.56);
      }
      dt {
        color: #6d8072;
        font-size: 0.72rem;
        font-weight: 900;
        text-transform: uppercase;
      }
      dd {
        margin: 3px 0 0;
        font-weight: 900;
      }
      @media (max-width: 900px) {
        header, .grid, .proof { display: block; }
        article + article { margin-top: 14px; }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <p>LilyTravelAgent Visual QA</p>
          <h1>/studio Recording Review</h1>
        </div>
        <p>${escapeHtml(summary.createdAt)}<br />${escapeHtml(summary.targetUrl)}</p>
      </header>
      <section class="grid">${cards}</section>
      ${proof}
      ${scriptMaterial}
    </main>
  </body>
</html>
`;
}

function buildClipNotes(summary) {
  const captures = summary.captures
    .map(
      (capture) => [
        `## ${capture.id === "coast" ? "海岸样例" : "大理样例"}`,
        ``,
        `- Screenshot: ${path.basename(capture.screenshotPath)}`,
        `- Roadbook title: ${capture.title}`,
        `- Destination input: ${capture.destination}`,
        `- Status: ${capture.statusText}`,
        `- Voiceover prompt: 展示 /studio 如何在 16:9 录屏台里切换到 ${capture.destination}，输入区、预览区和顶部状态同步变化。`,
      ].join("\n"),
    )
    .join("\n\n");

  return [
    `# /studio Visual QA Clip Notes`,
    ``,
    `- Target URL: ${summary.targetUrl}`,
    `- Created at: ${summary.createdAt}`,
    `- Viewport: ${summary.viewport.width}x${summary.viewport.height}`,
    `- Capture count: ${summary.captures.length}`,
    ``,
    `## Short Voiceover`,
    ``,
    `我把 /studio 当成内容生产工作台：不用每次等真实生成，也能稳定切换大理和海岸样例，检查输入区、路书预览和状态条是否同步。`,
    ``,
    captures,
    ``,
    `## Suite Run Proof Playback`,
    ``,
    `- Screenshot: ${path.basename(summary.proofPlayback.screenshotPath)}`,
    `- Final cue: ${summary.proofPlayback.finalActiveCue?.label || ""}`,
    `- State: ${summary.proofPlayback.finalActiveCue?.state || ""}`,
    `- Detail: ${summary.proofPlayback.finalActiveCue?.detail || ""}`,
    `- Button after playback: ${summary.proofPlayback.buttonTextAfterPlayback}`,
    `- Voiceover prompt: 播放证据线最后停在 Final Handoff，用最终交付摘要给 Studio 录屏证据链收口。`,
    ``,
    `## Proof Story Script Material`,
    ``,
    `- Screenshot: ${path.basename(summary.scriptMaterial.screenshotPath)}`,
    `- Script path: ${summary.scriptMaterial.scriptPath}`,
    `- Cue: ${summary.scriptMaterial.cue}`,
    `- Button: ${summary.scriptMaterial.buttonText}`,
    `- Proof Story Handoff: ${summary.scriptMaterial.handoffPreview}`,
    `- Handoff copy state: ${summary.scriptMaterial.handoffCopyState}`,
    `- Proof Story Complete: ${summary.scriptMaterial.completeLine}`,
    `- Proof Story Complete Bundle: ${summary.scriptMaterial.completeBundleLine}`,
    `- Complete Bundle copy state: ${summary.scriptMaterial.completeBundleCopyState}`,
    `- Proof Story Bundle Chain: ${summary.scriptMaterial.bundleChainLine}`,
    `- Bundle Chain copy state: ${summary.scriptMaterial.bundleChainCopyState}`,
    `- Proof Chain Summary: ${summary.scriptMaterial.proofChainSummaryLine}`,
    `- Proof Chain Summary copy state: ${summary.scriptMaterial.proofChainSummaryCopyState}`,
    `- Final Handoff summary: ${summary.scriptMaterial.finalDeliverySummaryLine}`,
    `- Final Handoff copy state: ${summary.scriptMaterial.finalDeliveryCopyState}`,
    `- Notes badge before copy: ${summary.scriptMaterial.finalDeliveryNotesBadgeBeforeCopy}`,
    `- Notes badge after copy: ${summary.scriptMaterial.finalDeliveryNotesBadgeAfterCopy}`,
    `- Voiceover prompt: Studio 现在把 Proof Story 脚本路径、证据时间线、四行预览和复制动作放在同一个录屏面板里。`,
    ``,
  ].join("\n");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
