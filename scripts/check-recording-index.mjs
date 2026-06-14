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
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const systemChromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const executablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE || (existsSync(systemChromePath) ? systemChromePath : undefined);

function resolveUrl(pathname) {
  return new URL(pathname, baseUrl).toString();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const localProof = await readLatestLocalDreamProof();
  if (!localProof) {
    console.log(`Recording index QA skipped: no local Dream visual-proof evidence found under ${visualChecksRoot}.`);
    console.log("Run npm run check:dream-visuals first, then rerun npm run check:recording-index.");
    return;
  }

  await assertReachable(resolveUrl("/api/recording-assets/index"));
  await runIndexCommand();
  await mkdir(outDir, { recursive: true });

  const staticIndexPath = path.join(recordingsRoot, "index.html");
  const staticIndex = await readFile(staticIndexPath, "utf8");
  assert(staticIndex.includes("Dream Proof"), `${staticIndexPath} does not include Dream Proof.`);
  assert(
    staticIndex.includes(`${localProof.finalCueLabel} · ${localProof.finalCueValue}`),
    `${staticIndexPath} does not include the latest Dream Proof final cue.`,
  );
  assert(staticIndex.includes(localProof.screenshotPath), `${staticIndexPath} does not link the Dream Proof playback screenshot.`);

  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const consoleMessages = [];

  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" && !text.includes("Failed to load resource")) {
      consoleMessages.push(`${message.type()}: ${text}`);
    }
  });

  const indexUrl = resolveUrl("/api/recording-assets/index");
  await page.goto(indexUrl, { waitUntil: "networkidle" });
  await page.waitForSelector(".visual-proof", { timeout: 30_000 });

  const proofText = await page.locator(".visual-proof").first().innerText();
  assert(proofText.includes("Dream Proof"), `API index proof block missing Dream Proof label: ${proofText}`);
  assert(proofText.includes(localProof.finalCueLabel), `API index proof block missing final cue label: ${proofText}`);
  assert(proofText.includes(localProof.finalCueValue), `API index proof block missing final cue value: ${proofText}`);

  const links = await page.locator(".visual-proof").first().locator("a").evaluateAll((anchors) =>
    anchors.map((anchor) => ({
      label: anchor.textContent?.trim() || "",
      href: anchor.getAttribute("href") || "",
    })),
  );

  const linkChecks = await verifyProofLinks(links);
  const screenshotPath = path.join(outDir, "recording-index-dream-proof.png");
  await page.locator(".visual-proof").first().screenshot({ path: screenshotPath });
  await browser.close();

  assert(consoleMessages.length === 0, `Unexpected browser console messages:\n${consoleMessages.join("\n")}`);

  const summary = {
    baseUrl,
    createdAt: new Date().toISOString(),
    outDir,
    staticIndexPath,
    apiIndexUrl: indexUrl,
    localProof,
    proofText,
    links: linkChecks,
    screenshotPath,
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

async function verifyProofLinks(links) {
  const required = [
    { id: "screenshot", label: "playback screenshot", expectedType: "image/png" },
    { id: "summary", label: "summary", expectedType: "application/json" },
    { id: "notes", label: "notes", expectedType: "text/markdown" },
  ];

  const results = [];
  for (const requiredLink of required) {
    const link = links.find((item) => item.label === requiredLink.label);
    assert(link, `API index Dream Proof link missing: ${requiredLink.label}`);
    assert(link.href.includes("/api/recording-assets/file?path="), `Dream Proof ${requiredLink.label} should use the safe file API: ${link.href}`);

    const url = new URL(link.href, baseUrl).toString();
    const response = await fetch(url);
    const contentType = response.headers.get("content-type") || "";
    assert(response.ok, `Dream Proof ${requiredLink.label} returned HTTP ${response.status}: ${url}`);
    assert(contentType.includes(requiredLink.expectedType), `Dream Proof ${requiredLink.label} content-type mismatch: ${contentType}`);
    results.push({
      id: requiredLink.id,
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
    "## Link Checks",
    "",
  ];

  for (const link of summary.links) {
    lines.push(`- ${link.label}: HTTP ${link.status} / ${link.contentType}`);
  }

  lines.push(
    "",
    "## Voiceover",
    "",
    "- The local archive now carries the same Dream Proof evidence that Studio shows.",
    "- The index check verifies the proof cue plus the screenshot, summary, and notes links.",
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
