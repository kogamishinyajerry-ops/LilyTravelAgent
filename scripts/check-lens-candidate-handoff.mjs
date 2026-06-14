import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.LENS_CANDIDATE_BASE_URL || process.env.RECORDING_SUITE_BASE_URL || "http://localhost:3000";
const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = process.env.LENS_CANDIDATE_OUT_DIR || path.join("recordings", "candidate-handoff-checks", runStamp);
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
  const dashboardUrl = resolveUrl("/api/recording-assets/lens-comparison");
  await assertReachable(dashboardUrl);
  await assertReachable(resolveUrl("/dream"));
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const consoleMessages = [];

  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" && !text.includes("Failed to load resource")) {
      consoleMessages.push(`${message.type()}: ${text}`);
    }
  });

  await page.goto(dashboardUrl, { waitUntil: "networkidle" });
  await page.waitForSelector(".candidate-primary", { timeout: 30_000 });

  const candidateLinkCount = await page.locator(".candidate-link").count();
  const queueChipCount = await page.locator(".candidate-sequence-chip").count();
  assert(candidateLinkCount >= 1, "No ranked candidate cards found. Run two complete Dream lens QA batches first.");
  assert(queueChipCount >= 2, "Need at least two queue chips to verify a non-primary queue handoff.");

  const firstCardHref = await page.locator(".candidate-link").first().getAttribute("href");
  const primaryHref = await page.locator(".candidate-primary").getAttribute("href");
  assert(primaryHref === firstCardHref, `Primary href should match first candidate href. Primary=${primaryHref} first=${firstCardHref}`);

  const checks = [
    {
      id: "primary",
      label: "Open first candidate",
      selector: ".candidate-primary",
      href: primaryHref,
    },
    {
      id: "first-card",
      label: "First candidate card",
      selector: ".candidate-link",
      href: firstCardHref,
    },
    {
      id: "second-chip",
      label: "Second queue chip",
      selector: ".candidate-sequence-chip >> nth=1",
      href: await page.locator(".candidate-sequence-chip").nth(1).getAttribute("href"),
    },
  ];

  const captures = [];
  for (const check of checks) {
    const expected = readCandidateParams(check.href, check.label);
    await page.goto(dashboardUrl, { waitUntil: "networkidle" });
    await page.waitForSelector(check.selector.split(" >> ")[0], { timeout: 30_000 });

    const locator =
      check.id === "second-chip"
        ? page.locator(".candidate-sequence-chip").nth(1)
        : check.id === "first-card"
          ? page.locator(".candidate-link").first()
          : page.locator(check.selector);
    await Promise.all([page.waitForURL(/\/dream\?/, { waitUntil: "networkidle", timeout: 30_000 }), locator.click()]);

    const actual = readCandidateParams(page.url(), check.label);
    assert(actual.pathname === "/dream", `${check.label} should land on /dream, got ${actual.pathname}.`);
    assert(actual.lens === expected.lens, `${check.label} lens mismatch: expected ${expected.lens}, got ${actual.lens}.`);
    assert(actual.rank === expected.rank, `${check.label} rank mismatch: expected ${expected.rank}, got ${actual.rank}.`);
    assert(actual.day === expected.day, `${check.label} day mismatch: expected ${expected.day}, got ${actual.day}.`);

    await page.waitForSelector(".dream-candidate-handoff", { timeout: 30_000 });
    const cueText = await page.locator(".dream-candidate-handoff").innerText();
    assert(cueText.includes(`#${expected.rank}/${expected.total}`), `${check.label} candidate cue missing rank/total: ${cueText}`);

    const activeLens = page.locator(`.dream-director-lens button[data-lens-id="${expected.lens}"]`);
    assert((await activeLens.count()) === 1, `${check.label} active lens button missing for ${expected.lens}.`);
    assert((await activeLens.getAttribute("aria-pressed")) === "true", `${check.label} lens ${expected.lens} is not active.`);

    const activeTimelineText = await page.locator('.dream-scene-timeline button[aria-pressed="true"]').innerText();
    assert(activeTimelineText.includes(`D${expected.day}`), `${check.label} active timeline day mismatch: ${activeTimelineText}`);

    const screenshotPath = path.join(outDir, `candidate-${check.id}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    captures.push({
      id: check.id,
      label: check.label,
      href: check.href,
      landedUrl: page.url(),
      lens: expected.lens,
      rank: expected.rank,
      total: expected.total,
      day: expected.day,
      screenshotPath,
    });
  }

  await browser.close();

  const summary = {
    baseUrl,
    createdAt: new Date().toISOString(),
    outDir,
    dashboardUrl,
    candidateLinkCount,
    queueChipCount,
    captures,
    consoleMessages,
  };

  const summaryPath = path.join(outDir, "summary.json");
  const notesPath = path.join(outDir, "clip-notes.md");
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(notesPath, buildClipNotes(summary));

  assert(consoleMessages.length === 0, `Unexpected browser console messages:\n${consoleMessages.join("\n")}`);

  console.log(`Lens candidate handoff QA passed: ${summaryPath}`);
  console.log(`Lens candidate handoff clip notes: ${notesPath}`);
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
    throw new Error(`Cannot reach ${url}. Start the local app first with npm run dev, or set LENS_CANDIDATE_BASE_URL. Detail: ${detail}`);
  } finally {
    clearTimeout(timeout);
  }
}

function readCandidateParams(href, label) {
  assert(href, `${label} href is missing.`);
  const url = new URL(href, baseUrl);
  const params = url.searchParams;
  const rank = params.get("candidateRank");
  const total = params.get("candidateTotal");
  const day = params.get("candidateDay");
  const lens = params.get("lens");
  assert(url.pathname === "/dream", `${label} href should point at /dream, got ${url.pathname}.`);
  assert(params.get("candidate") === "1", `${label} href missing candidate=1.`);
  assert(rank, `${label} href missing candidateRank.`);
  assert(total, `${label} href missing candidateTotal.`);
  assert(day, `${label} href missing candidateDay.`);
  assert(lens, `${label} href missing lens.`);
  return {
    pathname: url.pathname,
    lens,
    rank,
    total,
    day,
  };
}

function buildClipNotes(summary) {
  const lines = [
    "# Lens Candidate Handoff QA Clip Notes",
    "",
    `Created: ${summary.createdAt}`,
    `Dashboard: ${summary.dashboardUrl}`,
    "",
    "## Click Checks",
    "",
  ];

  for (const capture of summary.captures) {
    lines.push(
      `- ${capture.label}: #${capture.rank}/${capture.total} ${capture.lens} D${capture.day}`,
      `  - Href: ${capture.href}`,
      `  - Landed: ${capture.landedUrl}`,
      `  - Screenshot: ${path.basename(capture.screenshotPath)}`,
    );
  }

  lines.push(
    "",
    "## Voiceover",
    "",
    "- The dashboard candidate queue is not just visual; every entry carries its recording context into /dream.",
    "- The primary action, first candidate card, and queue chip all preserve rank, day, and lens state.",
    "",
  );

  return `${lines.join("\n")}\n`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
