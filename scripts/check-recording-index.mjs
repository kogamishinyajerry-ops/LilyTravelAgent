import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.RECORDING_INDEX_BASE_URL || process.env.RECORDING_SUITE_BASE_URL || "http://localhost:3000";
const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = process.env.RECORDING_INDEX_OUT_DIR || path.join("recordings", "index-checks", runStamp);
const recordingsRoot = process.env.RECORDINGS_DIR || "recordings";
const visualChecksRoot = path.join(recordingsRoot, "visual-checks");
const studioChecksRoot = path.join(recordingsRoot, "studio-checks");
const skipRebuild = process.env.RECORDING_INDEX_SKIP_REBUILD === "1";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const systemChromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const executablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE || (existsSync(systemChromePath) ? systemChromePath : undefined);
const proofStoryProductionAssetsLabel = "Proof Story Production Assets";
const proofStoryNarrationPreview = "Studio 现在把 Proof Story 脚本路径、证据时间线、四行预览和复制动作放在同一个录屏面板里。";
const proofStoryCloseoutStatus = "Proof Story · 脚本路径: 就绪 · Studio QA: 已捕获 · 索引入库: 已入库";

function resolveUrl(pathname) {
  return new URL(pathname, baseUrl).toString();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const dreamProof = await readLatestLocalDreamProof();
  const studioProof = await readLatestLocalStudioProof();
  if (!dreamProof && !studioProof) {
    console.log(`Recording index QA skipped: no local Dream or Studio proof evidence found under ${recordingsRoot}.`);
    console.log("Run npm run check:recording-suite first, then rerun npm run check:recording-index.");
    return;
  }
  assert(dreamProof, `Recording index QA expected Dream Proof evidence under ${visualChecksRoot}, but none was found.`);
  assert(studioProof, `Recording index QA expected Studio Proof evidence under ${studioChecksRoot}, but none was found.`);
  const proofs = [dreamProof, studioProof];
  const scriptMaterial = studioProof.scriptMaterial || null;

  await assertReachable(resolveUrl("/api/recording-assets/index"));
  if (skipRebuild) {
    console.log("Recording asset index generation skipped: using existing index from the recording suite.");
  } else {
    await runIndexCommand();
  }
  await mkdir(outDir, { recursive: true });

  const staticIndexPath = path.join(recordingsRoot, "index.html");
  const staticIndex = await readFile(staticIndexPath, "utf8");
  for (const proof of proofs) {
    assertStaticProof(staticIndex, staticIndexPath, proof);
  }
  if (scriptMaterial) {
    assertStaticScriptMaterial(staticIndex, staticIndexPath, scriptMaterial);
  }

  const browser = await chromium.launch({ headless: true, executablePath });
  const consoleMessages = [];
  const proofChecks = [];
  let scriptMaterialCheck = null;
  const indexUrl = resolveUrl("/api/recording-assets/index");

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

    page.on("console", (message) => {
      const text = message.text();
      if (message.type() === "error" && !text.includes("Failed to load resource")) {
        consoleMessages.push(`${message.type()}: ${text}`);
      }
    });

    await page.goto(indexUrl, { waitUntil: "networkidle" });
    await page.waitForSelector(".visual-proof", { timeout: 30_000 });
    await page.waitForSelector(".studio-proof", { timeout: 30_000 });

    for (const proof of proofs) {
      const { block, proofText, linkChecks } = await findMatchingProofBlock(page, proof);
      const screenshotPath = path.join(outDir, `recording-index-${proof.proofId}-proof.png`);
      await block.screenshot({ path: screenshotPath });
      proofChecks.push({
        proofId: proof.proofId,
        label: proof.label,
        proofText,
        links: linkChecks,
        screenshotPath,
      });
    }

    if (scriptMaterial) {
      const { block, proofText, linkChecks } = await findMatchingScriptMaterialBlock(page, scriptMaterial);
      const screenshotPath = path.join(outDir, "recording-index-script-material-proof.png");
      await block.screenshot({ path: screenshotPath });
      scriptMaterialCheck = {
        proofId: scriptMaterial.proofId,
        label: scriptMaterial.label,
        proofText,
        links: linkChecks,
        screenshotPath,
      };
    }
  } finally {
    await browser.close();
  }

  assert(consoleMessages.length === 0, `Unexpected browser console messages:\n${consoleMessages.join("\n")}`);
  const dreamCheck = proofChecks.find((proof) => proof.proofId === "dream");
  const studioCheck = proofChecks.find((proof) => proof.proofId === "studio");
  const allLinks = proofChecks.flatMap((proof) => proof.links);

  const summary = {
    baseUrl,
    createdAt: new Date().toISOString(),
    outDir,
    staticIndexPath,
    apiIndexUrl: indexUrl,
    localProof: dreamProof,
    localStudioProof: studioProof,
    proofText: dreamCheck?.proofText || "",
    studioProofText: studioCheck?.proofText || "",
    links: allLinks,
    proofChecks,
    scriptMaterialCheck,
    screenshotPath: dreamCheck?.screenshotPath || "",
    studioScreenshotPath: studioCheck?.screenshotPath || "",
    consoleMessages,
  };

  const summaryPath = path.join(outDir, "summary.json");
  const notesPath = path.join(outDir, "clip-notes.md");
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(notesPath, buildClipNotes(summary));

  console.log(`Recording index QA passed: ${summaryPath}`);
  console.log(`Recording index clip notes: ${notesPath}`);
}

async function readLatestLocalDreamProof() {
  if (!existsSync(visualChecksRoot)) {
    return null;
  }

  const entries = (await readdir(visualChecksRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();

  for (const entry of entries) {
    const packDir = path.join(visualChecksRoot, entry);
    const summaryPath = path.join(packDir, "summary.json");
    if (!existsSync(summaryPath)) {
      continue;
    }

    const summary = JSON.parse(await readFile(summaryPath, "utf8"));
    const visualProof = summary.visualProof && typeof summary.visualProof === "object" ? summary.visualProof : null;
    const finalCue = visualProof?.finalActiveCue && typeof visualProof.finalActiveCue === "object" ? visualProof.finalActiveCue : null;
    if (!visualProof || !finalCue) {
      continue;
    }

    const screenshotFile = path.basename(typeof visualProof.screenshotPath === "string" ? visualProof.screenshotPath : "");
    return {
      id: entry,
      proofId: "dream",
      label: "Dream Proof",
      selector: ".visual-proof:not(.studio-proof)",
      createdAt: typeof summary.createdAt === "string" ? summary.createdAt : entry,
      finalCueLabel: typeof finalCue.label === "string" ? finalCue.label : "",
      finalCueValue: typeof finalCue.value === "string" ? finalCue.value : "",
      screenshotPath: screenshotFile ? toRecordingLink(path.join("visual-checks", entry, screenshotFile)) : "",
      summaryPath: toRecordingLink(path.join("visual-checks", entry, "summary.json")),
      notesPath: existsSync(path.join(packDir, "clip-notes.md")) ? toRecordingLink(path.join("visual-checks", entry, "clip-notes.md")) : "",
    };
  }

  return null;
}

async function readLatestLocalStudioProof() {
  if (!existsSync(studioChecksRoot)) {
    return null;
  }

  const entries = (await readdir(studioChecksRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();

  for (const entry of entries) {
    const packDir = path.join(studioChecksRoot, entry);
    const summaryPath = path.join(packDir, "summary.json");
    if (!existsSync(summaryPath)) {
      continue;
    }

    const summary = JSON.parse(await readFile(summaryPath, "utf8"));
    const proofPlayback = summary.proofPlayback && typeof summary.proofPlayback === "object" ? summary.proofPlayback : null;
    const finalCue = proofPlayback?.finalActiveCue && typeof proofPlayback.finalActiveCue === "object" ? proofPlayback.finalActiveCue : null;
    if (!proofPlayback || !finalCue) {
      continue;
    }

    const screenshotFile = path.basename(typeof proofPlayback.screenshotPath === "string" ? proofPlayback.screenshotPath : "");
    const scriptMaterial = readStudioScriptMaterial(entry, packDir, summary);
    return {
      id: entry,
      proofId: "studio",
      label: "Studio Proof",
      selector: ".studio-proof",
      createdAt: typeof summary.createdAt === "string" ? summary.createdAt : entry,
      finalCueLabel: typeof finalCue.label === "string" ? finalCue.label : "",
      finalCueValue: typeof finalCue.detail === "string" ? finalCue.detail : "",
      screenshotPath: screenshotFile ? toRecordingLink(path.join("studio-checks", entry, screenshotFile)) : "",
      summaryPath: toRecordingLink(path.join("studio-checks", entry, "summary.json")),
      notesPath: existsSync(path.join(packDir, "clip-notes.md")) ? toRecordingLink(path.join("studio-checks", entry, "clip-notes.md")) : "",
      scriptMaterial,
    };
  }

  return null;
}

function readStudioScriptMaterial(entry, packDir, summary) {
  const scriptMaterial = summary.scriptMaterial && typeof summary.scriptMaterial === "object" ? summary.scriptMaterial : null;
  if (!scriptMaterial) {
    return null;
  }

  const screenshotFile = path.basename(typeof scriptMaterial.screenshotPath === "string" ? scriptMaterial.screenshotPath : "");
  return {
    proofId: "script-material",
    label: "Proof Story Script Material",
    selector: ".script-material-proof",
    cue: typeof scriptMaterial.cue === "string" ? scriptMaterial.cue : "",
    screenshotPath: screenshotFile ? toRecordingLink(path.join("studio-checks", entry, screenshotFile)) : "",
    summaryPath: toRecordingLink(path.join("studio-checks", entry, "summary.json")),
    notesPath: existsSync(path.join(packDir, "clip-notes.md")) ? toRecordingLink(path.join("studio-checks", entry, "clip-notes.md")) : "",
  };
}

function assertStaticProof(staticIndex, staticIndexPath, proof) {
  assert(staticIndex.includes(proof.label), `${staticIndexPath} does not include ${proof.label}.`);
  assert(
    staticIndex.includes(`${proof.finalCueLabel} · ${proof.finalCueValue}`),
    `${staticIndexPath} does not include the latest ${proof.label} final cue.`,
  );
  assert(proof.screenshotPath, `${proof.label} local proof is missing a playback screenshot path.`);
  assert(proof.summaryPath, `${proof.label} local proof is missing a summary path.`);
  assert(proof.notesPath, `${proof.label} local proof is missing a notes path.`);
  assert(staticIndex.includes(proof.screenshotPath), `${staticIndexPath} does not link the ${proof.label} playback screenshot.`);
  assert(staticIndex.includes(proof.summaryPath), `${staticIndexPath} does not link the ${proof.label} summary.`);
  assert(staticIndex.includes(proof.notesPath), `${staticIndexPath} does not link the ${proof.label} notes.`);
}

function assertStaticScriptMaterial(staticIndex, staticIndexPath, scriptMaterial) {
  assert(staticIndex.includes(proofStoryProductionAssetsLabel), `${staticIndexPath} does not include ${proofStoryProductionAssetsLabel}.`);
  assert(staticIndex.includes(scriptMaterial.label), `${staticIndexPath} does not include ${scriptMaterial.label}.`);
  assert(staticIndex.includes(proofStoryNarrationPreview), `${staticIndexPath} does not include the Proof Story narration preview.`);
  assert(staticIndex.includes(proofStoryCloseoutStatus), `${staticIndexPath} does not include the Proof Story closeout status.`);
  assert(staticIndex.includes(scriptMaterial.cue), `${staticIndexPath} does not include the ${scriptMaterial.label} cue.`);
  assert(scriptMaterial.screenshotPath, `${scriptMaterial.label} local proof is missing a screenshot path.`);
  assert(scriptMaterial.summaryPath, `${scriptMaterial.label} local proof is missing a summary path.`);
  assert(scriptMaterial.notesPath, `${scriptMaterial.label} local proof is missing a notes path.`);
  assert(staticIndex.includes(scriptMaterial.screenshotPath), `${staticIndexPath} does not link the ${scriptMaterial.label} screenshot.`);
  assert(staticIndex.includes(scriptMaterial.summaryPath), `${staticIndexPath} does not link the ${scriptMaterial.label} summary.`);
  assert(staticIndex.includes(scriptMaterial.notesPath), `${staticIndexPath} does not link the ${scriptMaterial.label} notes.`);
}

function assertProofText(proof, proofText) {
  assert(proofText.includes(proof.label), `API index proof block missing ${proof.label} label: ${proofText}`);
  assert(proofText.includes(proof.finalCueLabel), `API index ${proof.label} block missing final cue label: ${proofText}`);
  assert(proofText.includes(proof.finalCueValue), `API index ${proof.label} block missing final cue value: ${proofText}`);
}

function assertScriptMaterialText(scriptMaterial, proofText) {
  assert(proofText.includes(proofStoryProductionAssetsLabel), `API index script-material block missing ${proofStoryProductionAssetsLabel}: ${proofText}`);
  assert(proofText.includes(scriptMaterial.label), `API index script-material block missing label: ${proofText}`);
  assert(proofText.includes(proofStoryNarrationPreview), `API index script-material block missing narration preview: ${proofText}`);
  assert(proofText.includes(proofStoryCloseoutStatus), `API index script-material block missing closeout status: ${proofText}`);
  assert(proofText.includes(scriptMaterial.cue), `API index script-material block missing cue: ${proofText}`);
}

async function findMatchingProofBlock(page, proof) {
  const blocks = page.locator(proof.selector);
  const blockCount = await blocks.count();
  assert(blockCount > 0, `API index proof block missing for ${proof.label}.`);

  const diagnostics = [];
  for (let index = 0; index < blockCount; index += 1) {
    const block = blocks.nth(index);
    const proofText = await block.innerText();
    const links = await block.locator("a").evaluateAll((anchors) =>
      anchors.map((anchor) => ({
        label: anchor.textContent?.trim() || "",
        href: anchor.getAttribute("href") || "",
      })),
    );

    try {
      assertProofText(proof, proofText);
      const linkChecks = await verifyProofLinks(proof, links);
      return { block, proofText, linkChecks };
    } catch (error) {
      diagnostics.push(`block ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`API index matching ${proof.label} block not found.\n${diagnostics.join("\n")}`);
}

async function findMatchingScriptMaterialBlock(page, scriptMaterial) {
  const blocks = page.locator(scriptMaterial.selector);
  const blockCount = await blocks.count();
  assert(blockCount > 0, `API index proof block missing for ${scriptMaterial.label}.`);

  const diagnostics = [];
  for (let index = 0; index < blockCount; index += 1) {
    const block = blocks.nth(index);
    const proofText = await block.innerText();
    const links = await block.locator("a").evaluateAll((anchors) =>
      anchors.map((anchor) => ({
        label: anchor.textContent?.trim() || "",
        href: anchor.getAttribute("href") || "",
      })),
    );

    try {
      assertScriptMaterialText(scriptMaterial, proofText);
      const linkChecks = await verifyScriptMaterialLinks(scriptMaterial, links);
      return { block, proofText, linkChecks };
    } catch (error) {
      diagnostics.push(`block ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`API index matching ${scriptMaterial.label} block not found.\n${diagnostics.join("\n")}`);
}

async function verifyProofLinks(proof, links) {
  const required = [
    { id: "screenshot", label: "playback screenshot", expectedType: "image/png", expectedPath: proof.screenshotPath },
    { id: "summary", label: "summary", expectedType: "application/json", expectedPath: proof.summaryPath },
    { id: "notes", label: "notes", expectedType: "text/markdown", expectedPath: proof.notesPath },
  ];

  const results = [];
  for (const requiredLink of required) {
    const link = links.find((item) => item.label === requiredLink.label);
    assert(requiredLink.expectedPath, `${proof.label} local proof is missing expected ${requiredLink.label} path.`);
    assert(link, `API index ${proof.label} link missing: ${requiredLink.label}`);
    assert(link.href.includes("/api/recording-assets/file?path="), `${proof.label} ${requiredLink.label} should use the safe file API: ${link.href}`);

    const url = new URL(link.href, baseUrl).toString();
    const safePath = new URL(url).searchParams.get("path") || "";
    assert(safePath === requiredLink.expectedPath, `${proof.label} ${requiredLink.label} path mismatch: expected ${requiredLink.expectedPath}, got ${safePath}`);
    const response = await fetch(url);
    const contentType = response.headers.get("content-type") || "";
    assert(response.ok, `${proof.label} ${requiredLink.label} returned HTTP ${response.status}: ${url}`);
    assert(contentType.includes(requiredLink.expectedType), `${proof.label} ${requiredLink.label} content-type mismatch: ${contentType}`);
    results.push({
      id: requiredLink.id,
      proofId: proof.proofId,
      proofLabel: proof.label,
      label: requiredLink.label,
      href: link.href,
      status: response.status,
      contentType,
    });
  }

  return results;
}

async function verifyScriptMaterialLinks(scriptMaterial, links) {
  const required = [
    { id: "screenshot", label: "script card screenshot", expectedType: "image/png", expectedPath: scriptMaterial.screenshotPath },
    { id: "summary", label: "summary", expectedType: "application/json", expectedPath: scriptMaterial.summaryPath },
    { id: "notes", label: "notes", expectedType: "text/markdown", expectedPath: scriptMaterial.notesPath },
  ];

  const results = [];
  for (const requiredLink of required) {
    const link = links.find((item) => item.label === requiredLink.label);
    assert(requiredLink.expectedPath, `${scriptMaterial.label} local proof is missing expected ${requiredLink.label} path.`);
    assert(link, `API index ${scriptMaterial.label} link missing: ${requiredLink.label}`);
    assert(link.href.includes("/api/recording-assets/file?path="), `${scriptMaterial.label} ${requiredLink.label} should use the safe file API: ${link.href}`);

    const url = new URL(link.href, baseUrl).toString();
    const safePath = new URL(url).searchParams.get("path") || "";
    assert(safePath === requiredLink.expectedPath, `${scriptMaterial.label} ${requiredLink.label} path mismatch: expected ${requiredLink.expectedPath}, got ${safePath}`);
    const response = await fetch(url);
    const contentType = response.headers.get("content-type") || "";
    assert(response.ok, `${scriptMaterial.label} ${requiredLink.label} returned HTTP ${response.status}: ${url}`);
    assert(contentType.includes(requiredLink.expectedType), `${scriptMaterial.label} ${requiredLink.label} content-type mismatch: ${contentType}`);
    results.push({
      id: requiredLink.id,
      proofId: scriptMaterial.proofId,
      proofLabel: scriptMaterial.label,
      label: requiredLink.label,
      href: link.href,
      status: response.status,
      contentType,
    });
  }

  return results;
}

async function runIndexCommand() {
  await new Promise((resolve, reject) => {
    const child = spawn(npmCommand, ["run", "index:recording-assets"], {
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Recording asset index generation failed with ${signal ? `signal ${signal}` : `exit code ${code}`}.`));
    });
  });
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
    throw new Error(`Cannot reach ${url}. Start the local app first with npm run dev, or set RECORDING_INDEX_BASE_URL. Detail: ${detail}`);
  } finally {
    clearTimeout(timeout);
  }
}

function buildClipNotes(summary) {
  const lines = [
    "# Recording Index QA Clip Notes",
    "",
    `Created: ${summary.createdAt}`,
    `Index: ${summary.apiIndexUrl}`,
    `Static index: ${summary.staticIndexPath}`,
    "",
    "## Dream Proof",
    "",
    `- Final cue: ${summary.localProof.finalCueLabel} / ${summary.localProof.finalCueValue}`,
    `- Playback screenshot: ${summary.localProof.screenshotPath}`,
    `- Proof-card screenshot: ${path.basename(summary.screenshotPath)}`,
    "",
    "## Studio Proof",
    "",
    `- Final cue: ${summary.localStudioProof.finalCueLabel} / ${summary.localStudioProof.finalCueValue}`,
    `- Playback screenshot: ${summary.localStudioProof.screenshotPath}`,
    `- Proof-card screenshot: ${path.basename(summary.studioScreenshotPath)}`,
    "",
    "## Link Checks",
    "",
  ];

  for (const link of summary.links) {
    lines.push(`- ${link.proofLabel} ${link.label}: HTTP ${link.status} / ${link.contentType}`);
  }

  if (summary.scriptMaterialCheck) {
    lines.push(
      "",
      "## Proof Story Script Material",
      "",
      `- Proof-card screenshot: ${path.basename(summary.scriptMaterialCheck.screenshotPath)}`,
      `- Production Assets QA: ${proofStoryProductionAssetsLabel}; narration preview; closeout status; cue text; ${summary.scriptMaterialCheck.links.length}/3 evidence links checked.`,
    );

    for (const link of summary.scriptMaterialCheck.links) {
      lines.push(`- ${link.proofLabel} ${link.label}: HTTP ${link.status} / ${link.contentType}`);
    }
  }

  lines.push(
    "",
    "## Voiceover",
    "",
    "- The local archive now carries Dream Proof and Studio Proof evidence.",
    "- The index check verifies both proof cues plus six screenshot, summary, and notes links.",
    summary.scriptMaterialCheck ? "- When present, the same check also verifies the Proof Story Production Assets title, narration preview, closeout status, cue text, and three evidence links." : "",
    "",
  );

  return `${lines.join("\n")}\n`;
}

function toRecordingLink(relativePath) {
  return relativePath.split(path.sep).join("/");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
