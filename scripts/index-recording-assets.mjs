import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const recordingsRoot = process.env.RECORDINGS_DIR || "recordings";
const sources = [
  { type: "dream", dir: "visual-checks", label: "/dream visual QA" },
  { type: "studio", dir: "studio-checks", label: "/studio recording QA" },
  { type: "bridge", dir: "handoff-checks", label: "/studio ↔ /dream handoff QA" },
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
      lens: readDreamLens(summary),
      galleryPath: toRecordingLink(path.join(source.dir, entry, "index.html")),
      notesPath: existsSync(path.join(packDir, "clip-notes.md")) ? toRecordingLink(path.join(source.dir, entry, "clip-notes.md")) : "",
      summaryPath: toRecordingLink(path.join(source.dir, entry, "summary.json")),
      visualProof: source.type === "dream" ? readDreamVisualProof(entry, packDir, summary) : null,
      studioProof: source.type === "studio" ? readStudioProofPlayback(entry, packDir, summary) : null,
      scriptMaterial: source.type === "studio" ? readStudioScriptMaterial(entry, packDir, summary) : null,
    });
  }

  return packs;
}

function buildPackTitle(type, summary) {
  if (type === "studio") {
    return "Studio 16:9 demo pack";
  }

  if (type === "bridge") {
    return "Studio-Dream bridge QA pack";
  }

  if (type === "dream") {
    const lens = readDreamLens(summary);
    if (lens && lens !== "auto day lens") {
      return `Dream ${lens} visual pack`;
    }
  }

  return summary.demoRoadbook === "coast" ? "Dream coastal visual pack" : "Dream Dali visual pack";
}

function buildPackDetail(type, summary) {
  if (type === "studio") {
    const names = (summary.captures || []).map((capture) => capture.destination).join(" / ");
    return names || "Dali / Coastal recording layouts";
  }

  if (type === "bridge") {
    const names = (summary.captures || []).map((capture) => capture.destination).filter(Boolean).join(" / ");
    return names ? `${names} round trips` : "Studio ↔ Dream round trips";
  }

  const days = (summary.days || []).length;
  const motion = summary.motion?.changed ? "motion verified" : "motion pending";
  const lens = readDreamLens(summary);
  const lensDetail = lens ? ` · ${lens}` : "";
  return `${summary.demoRoadbook || "dali"} · ${days} day screenshots · ${motion}${lensDetail}`;
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
              ${pack.lens ? `<em>${escapeHtml(pack.lens)}</em>` : ""}
              <nav>
                <a href="${escapeHtml(pack.galleryPath)}">gallery</a>
                <a href="${escapeHtml(pack.summaryPath)}">summary</a>
                ${pack.notesPath ? `<a href="${escapeHtml(pack.notesPath)}">clip notes</a>` : ""}
              </nav>
              ${pack.visualProof ? `
                <div class="visual-proof">
                  <span>Dream Proof · ${escapeHtml(pack.visualProof.finalCueLabel)} · ${escapeHtml(pack.visualProof.finalCueValue)}</span>
                  <nav>
                    ${pack.visualProof.screenshotPath ? `<a href="${escapeHtml(pack.visualProof.screenshotPath)}">playback screenshot</a>` : ""}
                    <a href="${escapeHtml(pack.visualProof.summaryPath)}">summary</a>
                    ${pack.visualProof.notesPath ? `<a href="${escapeHtml(pack.visualProof.notesPath)}">clip notes</a>` : ""}
                  </nav>
                </div>` : ""}
              ${pack.studioProof ? `
                <div class="visual-proof studio-proof">
                  <span>Studio Proof · ${escapeHtml(pack.studioProof.finalCueLabel)} · ${escapeHtml(pack.studioProof.finalCueDetail)}</span>
                  <nav>
                    ${pack.studioProof.screenshotPath ? `<a href="${escapeHtml(pack.studioProof.screenshotPath)}">playback screenshot</a>` : ""}
                    <a href="${escapeHtml(pack.studioProof.summaryPath)}">summary</a>
                    ${pack.studioProof.notesPath ? `<a href="${escapeHtml(pack.studioProof.notesPath)}">clip notes</a>` : ""}
                  </nav>
                </div>` : ""}
              ${pack.scriptMaterial ? `
                <div class="visual-proof script-material-proof">
                  <span>Proof Story Script Material · ${escapeHtml(pack.scriptMaterial.cue)}</span>
                  <nav>
                    ${pack.scriptMaterial.screenshotPath ? `<a href="${escapeHtml(pack.scriptMaterial.screenshotPath)}">script card screenshot</a>` : ""}
                    <a href="${escapeHtml(pack.summaryPath)}">summary</a>
                    ${pack.notesPath ? `<a href="${escapeHtml(pack.notesPath)}">clip notes</a>` : ""}
                  </nav>
                </div>` : ""}
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
      em {
        width: fit-content;
        border: 1px solid rgba(47, 64, 56, 0.12);
        border-radius: 999px;
        padding: 5px 9px;
        color: #38584d;
        background: rgba(231, 240, 235, 0.72);
        font-size: 0.78rem;
        font-style: normal;
        font-weight: 900;
      }
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
      .visual-proof {
        display: grid;
        gap: 7px;
        border: 1px solid rgba(79, 143, 122, 0.2);
        border-radius: 8px;
        padding: 9px;
        background: rgba(79, 143, 122, 0.1);
      }
      .visual-proof span {
        color: #284f42;
        font-size: 0.82rem;
        font-weight: 950;
      }
      .visual-proof a {
        color: #fff;
        background: #4f8f7a;
      }
      .studio-proof {
        border-color: rgba(83, 96, 173, 0.22);
        background: rgba(83, 96, 173, 0.1);
      }
      .studio-proof span {
        color: #303d8d;
      }
      .studio-proof a {
        background: #5360ad;
      }
      .script-material-proof {
        border-color: rgba(214, 107, 61, 0.22);
        background: rgba(214, 107, 61, 0.1);
      }
      .script-material-proof span {
        color: #7a3c24;
      }
      .script-material-proof a {
        background: #d66b3d;
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
    if (pack.lens) {
      lines.push(`- Director Lens: ${pack.lens}`);
    }
    if (pack.visualProof) {
      lines.push(`- Dream Proof: ${pack.visualProof.finalCueLabel} / ${pack.visualProof.finalCueValue}`);
      if (pack.visualProof.screenshotPath) {
        lines.push(`- Dream Proof screenshot: ${pack.visualProof.screenshotPath}`);
      }
    }
    if (pack.studioProof) {
      lines.push(`- Studio Proof: ${pack.studioProof.finalCueLabel} / ${pack.studioProof.finalCueDetail}`);
      if (pack.studioProof.screenshotPath) {
        lines.push(`- Studio Proof screenshot: ${pack.studioProof.screenshotPath}`);
      }
    }
    if (pack.scriptMaterial) {
      lines.push(`- Proof Story Script Material: ${pack.scriptMaterial.cue}`);
      if (pack.scriptMaterial.screenshotPath) {
        lines.push(`- Proof Story Script Material screenshot: ${pack.scriptMaterial.screenshotPath}`);
      }
    }
    lines.push(`- Gallery: ${pack.galleryPath}`);
    lines.push(`- Summary: ${pack.summaryPath}`);
    if (pack.notesPath) {
      lines.push(`- Clip notes: ${pack.notesPath}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function readDreamVisualProof(entry, packDir, summary) {
  const visualProof = summary.visualProof && typeof summary.visualProof === "object" ? summary.visualProof : null;
  const finalCue = visualProof?.finalActiveCue && typeof visualProof.finalActiveCue === "object" ? visualProof.finalActiveCue : null;
  if (!visualProof || !finalCue) {
    return null;
  }

  const screenshotFile = path.basename(typeof visualProof.screenshotPath === "string" ? visualProof.screenshotPath : "");
  return {
    finalCueLabel: typeof finalCue.label === "string" ? finalCue.label : "",
    finalCueValue: typeof finalCue.value === "string" ? finalCue.value : "",
    screenshotPath: screenshotFile ? toRecordingLink(path.join("visual-checks", entry, screenshotFile)) : "",
    summaryPath: toRecordingLink(path.join("visual-checks", entry, "summary.json")),
    notesPath: existsSync(path.join(packDir, "clip-notes.md")) ? toRecordingLink(path.join("visual-checks", entry, "clip-notes.md")) : "",
  };
}

function readStudioProofPlayback(entry, packDir, summary) {
  const proofPlayback = summary.proofPlayback && typeof summary.proofPlayback === "object" ? summary.proofPlayback : null;
  const finalCue = proofPlayback?.finalActiveCue && typeof proofPlayback.finalActiveCue === "object" ? proofPlayback.finalActiveCue : null;
  if (!proofPlayback || !finalCue) {
    return null;
  }

  const screenshotFile = path.basename(typeof proofPlayback.screenshotPath === "string" ? proofPlayback.screenshotPath : "");
  return {
    finalCueLabel: typeof finalCue.label === "string" ? finalCue.label : "",
    finalCueDetail: typeof finalCue.detail === "string" ? finalCue.detail : "",
    screenshotPath: screenshotFile ? toRecordingLink(path.join("studio-checks", entry, screenshotFile)) : "",
    summaryPath: toRecordingLink(path.join("studio-checks", entry, "summary.json")),
    notesPath: existsSync(path.join(packDir, "clip-notes.md")) ? toRecordingLink(path.join("studio-checks", entry, "clip-notes.md")) : "",
  };
}

function readStudioScriptMaterial(entry, packDir, summary) {
  const scriptMaterial = summary.scriptMaterial && typeof summary.scriptMaterial === "object" ? summary.scriptMaterial : null;
  if (!scriptMaterial) {
    return null;
  }

  const screenshotFile = path.basename(typeof scriptMaterial.screenshotPath === "string" ? scriptMaterial.screenshotPath : "");
  return {
    scriptPath: typeof scriptMaterial.scriptPath === "string" ? scriptMaterial.scriptPath : "",
    cue: typeof scriptMaterial.cue === "string" ? scriptMaterial.cue : "",
    buttonText: typeof scriptMaterial.buttonText === "string" ? scriptMaterial.buttonText : "",
    screenshotPath: screenshotFile ? toRecordingLink(path.join("studio-checks", entry, screenshotFile)) : "",
    summaryPath: toRecordingLink(path.join("studio-checks", entry, "summary.json")),
    notesPath: existsSync(path.join(packDir, "clip-notes.md")) ? toRecordingLink(path.join("studio-checks", entry, "clip-notes.md")) : "",
  };
}

function toRecordingLink(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function readDreamLens(summary) {
  if (summary.activeLens && typeof summary.activeLens === "object" && typeof summary.activeLens.proof === "string") {
    return summary.activeLens.proof;
  }

  return typeof summary.directorLens === "string" ? summary.directorLens : "";
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
