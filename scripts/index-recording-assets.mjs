import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const recordingsRoot = process.env.RECORDINGS_DIR || "recordings";
const sources = [
  { type: "dream", dir: "visual-checks", label: "/dream visual QA" },
  { type: "studio", dir: "studio-checks", label: "/studio recording QA" },
];

async function main() {
  await mkdir(recordingsRoot, { recursive: true });
  const packs = (await Promise.all(sources.map(readSource))).flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const htmlPath = path.join(recordingsRoot, "index.html");
  const notesPath = path.join(recordingsRoot, "clip-index.md");

  await writeFile(htmlPath, buildHtmlIndex(packs));
  await writeFile(notesPath, buildMarkdownIndex(packs));

  console.log(`Recording asset index: ${htmlPath}`);
  console.log(`Recording clip index: ${notesPath}`);
  console.log(`Indexed packs: ${packs.length}`);
}

async function readSource(source) {
  const sourceRoot = path.join(recordingsRoot, source.dir);
  if (!existsSync(sourceRoot)) {
    return [];
  }

  const entries = await readdir(sourceRoot);
  const packs = [];

  for (const entry of entries) {
    const packDir = path.join(sourceRoot, entry);
    const info = await stat(packDir).catch(() => null);
    if (!info?.isDirectory()) {
      continue;
    }

    const summaryPath = path.join(packDir, "summary.json");
    if (!existsSync(summaryPath)) {
      continue;
    }

    const summary = JSON.parse(await readFile(summaryPath, "utf8"));
    packs.push({
      type: source.type,
      label: source.label,
      id: entry,
      createdAt: summary.createdAt || entry,
      title: buildPackTitle(source.type, summary),
      detail: buildPackDetail(source.type, summary),
      galleryPath: toRecordingLink(path.join(source.dir, entry, "index.html")),
      notesPath: existsSync(path.join(packDir, "clip-notes.md")) ? toRecordingLink(path.join(source.dir, entry, "clip-notes.md")) : "",
      summaryPath: toRecordingLink(path.join(source.dir, entry, "summary.json")),
    });
  }

  return packs;
}

function buildPackTitle(type, summary) {
  if (type === "studio") {
    return "Studio 16:9 demo pack";
  }

  return summary.demoRoadbook === "coast" ? "Dream coastal visual pack" : "Dream Dali visual pack";
}

function buildPackDetail(type, summary) {
  if (type === "studio") {
    const names = (summary.captures || []).map((capture) => capture.destination).join(" / ");
    return names || "Dali / Coastal recording layouts";
  }

  const days = (summary.days || []).length;
  const motion = summary.motion?.changed ? "motion verified" : "motion pending";
  return `${summary.demoRoadbook || "dali"} · ${days} day screenshots · ${motion}`;
}

function buildHtmlIndex(packs) {
  const cards = packs.length
    ? packs
        .map(
          (pack) => `
            <article>
              <p>${escapeHtml(pack.label)}</p>
              <h2>${escapeHtml(pack.title)}</h2>
              <small>${escapeHtml(pack.createdAt)}</small>
              <strong>${escapeHtml(pack.detail)}</strong>
              <nav>
                <a href="${escapeHtml(pack.galleryPath)}">gallery</a>
                <a href="${escapeHtml(pack.summaryPath)}">summary</a>
                ${pack.notesPath ? `<a href="${escapeHtml(pack.notesPath)}">clip notes</a>` : ""}
              </nav>
            </article>`,
        )
        .join("")
    : `<article><p>No recording QA packs found yet.</p><h2>Run npm run check:dream-visuals or npm run check:studio-visuals</h2></article>`;

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>LilyTravelAgent Recording Asset Index</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #24312d;
        background: #e8ebe4;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(1180px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 30px 0 44px;
      }
      h1, h2, p { margin: 0; }
      header {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 18px;
      }
      h1 { font-size: clamp(2rem, 4vw, 3.6rem); line-height: 0.95; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
      article {
        display: grid;
        gap: 9px;
        border: 1px solid rgba(47, 64, 56, 0.13);
        border-radius: 8px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.72);
        box-shadow: 0 18px 42px rgba(40, 52, 47, 0.1);
      }
      article p, small { color: #66806f; font-size: 0.76rem; font-weight: 900; text-transform: uppercase; }
      h2 { font-size: 1.35rem; }
      strong { color: #34443c; }
      nav { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
      a {
        border: 1px solid rgba(47, 64, 56, 0.16);
        border-radius: 999px;
        padding: 7px 10px;
        color: #284f42;
        font-weight: 900;
        text-decoration: none;
        background: rgba(255, 255, 255, 0.6);
      }
      @media (max-width: 860px) { header, .grid { display: block; } article + article { margin-top: 12px; } }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <p>LilyTravelAgent</p>
          <h1>Recording Asset Index</h1>
        </div>
        <p>${packs.length} packs</p>
      </header>
      <section class="grid">${cards}</section>
    </main>
  </body>
</html>
`;
}

function buildMarkdownIndex(packs) {
  const lines = [
    "# LilyTravelAgent Recording Asset Index",
    "",
    `Indexed packs: ${packs.length}`,
    "",
  ];

  if (packs.length === 0) {
    lines.push("No recording QA packs found yet.");
    lines.push("");
    return lines.join("\n");
  }

  for (const pack of packs) {
    lines.push(`## ${pack.title}`);
    lines.push("");
    lines.push(`- Type: ${pack.label}`);
    lines.push(`- Created: ${pack.createdAt}`);
    lines.push(`- Detail: ${pack.detail}`);
    lines.push(`- Gallery: ${pack.galleryPath}`);
    lines.push(`- Summary: ${pack.summaryPath}`);
    if (pack.notesPath) {
      lines.push(`- Clip notes: ${pack.notesPath}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function toRecordingLink(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
