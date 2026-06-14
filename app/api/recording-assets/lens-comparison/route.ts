import path from "node:path";
import { NextResponse } from "next/server";
import { directorLenses } from "@/lib/director-lens";
import {
  compareLensSceneStats,
  readLensComparisonDashboard,
  type LensComparisonBatch,
  type LensComparisonDashboard,
  type LensComparisonDay,
  type LensComparisonPack,
  type LensRecordingCandidate,
} from "@/lib/lens-comparison";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const recordingsRoot = path.join(/*turbopackIgnore: true*/ process.cwd(), "recordings");

export async function GET() {
  const dashboard = await readLensComparisonDashboard(recordingsRoot);
  return new NextResponse(buildLensComparisonHtml(dashboard), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function buildLensComparisonHtml(dashboard: LensComparisonDashboard) {
  const currentPacks = dashboard.currentBatch?.packs.length ? dashboard.currentBatch.packs : dashboard.packs;
  const previousPacksByLens = new Map((dashboard.previousBatch?.packs || []).map((pack) => [pack.lensId, pack]));
  const lensCards = dashboard.packs.length
    ? currentPacks.map((pack) => renderLensCard(pack, previousPacksByLens.get(pack.lensId))).join("")
    : `<article class="empty">
        <p>No Dream lens QA packs yet.</p>
        <h2>Run <code>npm run check:dream-lenses</code></h2>
      </article>`;
  const missing = dashboard.missingLensIds.length
    ? `<p class="missing">Missing: ${dashboard.missingLensIds.map((id) => escapeHtml(id)).join(" / ")}</p>`
    : `<p class="missing ready">All Director Lens modes have review packs.</p>`;

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>LilyTravelAgent Director Lens Comparison</title>
    <style>
      * { box-sizing: border-box; }
      :root {
        color-scheme: dark;
        --ink: #f3efe3;
        --muted: rgba(243, 239, 227, 0.62);
        --line: rgba(243, 239, 227, 0.13);
        --panel: rgba(20, 24, 21, 0.82);
        --glass: rgba(243, 239, 227, 0.06);
        --green: #84b59a;
        --amber: #e6aa4d;
        --coral: #db7965;
        --blue: #8ba6d9;
      }
      body {
        margin: 0;
        min-height: 100vh;
        color: var(--ink);
        background:
          linear-gradient(120deg, rgba(132, 181, 154, 0.16), transparent 34%),
          linear-gradient(220deg, rgba(230, 170, 77, 0.14), transparent 36%),
          #10130f;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(1440px, calc(100vw - 34px));
        margin: 0 auto;
        padding: 26px 0 36px;
      }
      h1, h2, h3, p { margin: 0; }
      header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: end;
        gap: 18px;
        margin-bottom: 14px;
      }
      .eyebrow {
        color: var(--green);
        font-size: 0.78rem;
        font-weight: 900;
        letter-spacing: 0;
        text-transform: uppercase;
      }
      h1 {
        max-width: 820px;
        margin-top: 5px;
        font-size: clamp(2.1rem, 4.8vw, 4.6rem);
        line-height: 0.92;
      }
      .stats {
        display: flex;
        flex-wrap: wrap;
        justify-content: end;
        gap: 8px;
      }
      .stats span, .missing {
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 7px 10px;
        color: var(--ink);
        background: rgba(255,255,255,0.06);
        font-size: 0.8rem;
        font-weight: 900;
      }
      .missing { display: inline-block; margin-bottom: 12px; color: var(--amber); }
      .missing.ready { color: var(--green); }
      .stack { display: grid; gap: 12px; }
      .candidate-strip {
        display: grid;
        grid-template-columns: 240px minmax(0, 1fr);
        gap: 1px;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 8px;
        margin-bottom: 12px;
        background: var(--line);
      }
      .candidate-head, .candidate-list a, .candidate-sequence-chip {
        background: rgba(255,255,255,0.055);
      }
      .candidate-head {
        display: grid;
        align-content: center;
        gap: 9px;
        padding: 14px;
      }
      .candidate-head span {
        color: var(--amber);
        font-size: 0.72rem;
        font-weight: 1000;
        text-transform: uppercase;
      }
      .candidate-head strong {
        color: var(--ink);
        font-size: 1.16rem;
        line-height: 1.05;
      }
      .candidate-primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 36px;
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 999px;
        padding: 8px 11px;
        color: #0f130f;
        background: var(--amber);
        font-size: 0.78rem;
        font-weight: 1000;
        text-decoration: none;
      }
      .candidate-sequence {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 5px;
      }
      .candidate-sequence-chip {
        display: grid;
        place-items: center;
        min-width: 0;
        min-height: 42px;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 8px;
        padding: 5px 3px;
        color: var(--ink);
        text-align: center;
        text-decoration: none;
      }
      .candidate-sequence-chip.is-first {
        border-color: rgba(230,170,77,0.72);
        background: rgba(230,170,77,0.16);
      }
      .candidate-sequence-chip span {
        color: var(--green);
        font-size: 0.68rem;
        font-weight: 1000;
        line-height: 1;
      }
      .candidate-sequence-chip small {
        color: var(--muted);
        font-size: 0.58rem;
        font-weight: 900;
        line-height: 1.05;
      }
      .candidate-list {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 1px;
      }
      .candidate-list a {
        display: grid;
        grid-template-columns: 72px minmax(0, 1fr);
        align-items: center;
        gap: 10px;
        min-height: 116px;
        padding: 12px;
        color: var(--ink);
        text-decoration: none;
      }
      .candidate-thumb {
        overflow: hidden;
        width: 72px;
        aspect-ratio: 1.2;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 7px;
        background: #111510;
      }
      .candidate-thumb img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: saturate(1.08) contrast(1.05);
      }
      .candidate-copy {
        display: grid;
        gap: 5px;
        min-width: 0;
      }
      .candidate-meta {
        color: var(--green);
        font-size: 0.7rem;
        font-weight: 1000;
        text-transform: uppercase;
      }
      .candidate-list strong {
        font-size: 1rem;
        line-height: 1.08;
      }
      .candidate-list small {
        color: var(--muted);
        font-size: 0.68rem;
        line-height: 1.25;
      }
      .batch-strip {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 12px;
      }
      .batch-panel {
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 13px 14px;
        background: rgba(255,255,255,0.055);
      }
      .batch-panel span {
        display: block;
        color: var(--green);
        font-size: 0.72rem;
        font-weight: 1000;
        text-transform: uppercase;
      }
      .batch-panel strong {
        display: block;
        margin-top: 5px;
        color: var(--ink);
        font-size: 1rem;
        line-height: 1.1;
      }
      .batch-panel small {
        display: block;
        margin-top: 5px;
        color: var(--muted);
        font-size: 0.72rem;
        line-height: 1.25;
      }
      article {
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel);
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
      }
      .lens {
        display: grid;
        grid-template-columns: 240px minmax(0, 1fr);
        min-height: 260px;
      }
      .lens-head {
        display: grid;
        align-content: space-between;
        gap: 16px;
        padding: 18px;
        background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
      }
      .lens-head h2 { font-size: 2.1rem; line-height: 0.95; }
      .lens-head p { color: var(--muted); font-size: 0.86rem; line-height: 1.35; }
      .lens-head strong {
        display: block;
        margin-top: 8px;
        color: var(--amber);
        font-size: 0.82rem;
        line-height: 1.35;
      }
      .before-after-note {
        display: block;
        margin-top: 8px;
        color: var(--blue);
        font-size: 0.72rem;
        font-weight: 900;
        line-height: 1.3;
      }
      .checklist {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .checklist span {
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 999px;
        padding: 5px 7px;
        color: var(--muted);
        font-size: 0.72rem;
        font-weight: 900;
      }
      .checklist .ready { color: var(--green); }
      .checklist .needs-review { color: var(--coral); }
      .lens-links {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }
      .lens-links a, .lens-links code {
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 999px;
        padding: 6px 8px;
        color: var(--ink);
        background: rgba(255,255,255,0.07);
        font-size: 0.72rem;
        font-weight: 900;
        text-decoration: none;
      }
      .lens-links a:first-child {
        color: #0f130f;
        background: var(--green);
      }
      .shots {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 1px;
        background: var(--line);
      }
      figure {
        position: relative;
        display: grid;
        min-height: 260px;
        margin: 0;
        background: #171b17;
      }
      figure img {
        width: 100%;
        height: 100%;
        min-height: 260px;
        object-fit: cover;
        filter: saturate(1.04) contrast(1.04);
      }
      .frame-pair {
        display: grid;
        grid-template-rows: repeat(2, minmax(124px, 1fr));
        gap: 1px;
        min-height: 260px;
        background: rgba(255,255,255,0.08);
      }
      .frame {
        position: relative;
        min-height: 124px;
        background: #111510;
      }
      .frame img {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 124px;
        object-fit: cover;
      }
      .frame.empty {
        display: grid;
        place-items: center;
        color: var(--muted);
        font-size: 0.78rem;
        font-weight: 900;
      }
      .frame-label {
        position: absolute;
        left: 8px;
        top: 8px;
        z-index: 1;
        border: 1px solid rgba(255,255,255,0.13);
        border-radius: 999px;
        padding: 4px 7px;
        color: #0f130f;
        background: var(--green);
        font-size: 0.62rem;
        font-weight: 1000;
        letter-spacing: 0;
        text-transform: uppercase;
      }
      .frame.previous .frame-label {
        color: var(--ink);
        background: rgba(15,19,15,0.72);
      }
      .diff-badge {
        position: absolute;
        right: 8px;
        top: 8px;
        z-index: 1;
        border: 1px solid rgba(255,255,255,0.14);
        border-radius: 999px;
        padding: 4px 7px;
        color: var(--ink);
        background: rgba(15,19,15,0.68);
        font-size: 0.62rem;
        font-weight: 1000;
        letter-spacing: 0;
        text-transform: uppercase;
      }
      .diff-badge.changed {
        color: #0f130f;
        background: var(--amber);
      }
      .diff-badge.subtle {
        color: #0f130f;
        background: var(--blue);
      }
      .diff-badge.missing {
        color: var(--ink);
        background: rgba(219,121,101,0.64);
      }
      figcaption {
        position: absolute;
        inset: auto 8px 8px;
        display: grid;
        gap: 4px;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 8px;
        padding: 8px;
        background: rgba(10, 12, 10, 0.62);
        backdrop-filter: blur(10px);
      }
      figcaption span {
        color: var(--green);
        font-size: 0.76rem;
        font-weight: 1000;
      }
      figcaption strong {
        color: var(--ink);
        font-size: 0.92rem;
        line-height: 1.05;
      }
      figcaption small {
        color: var(--muted);
        font-size: 0.7rem;
        line-height: 1.2;
      }
      .empty {
        display: grid;
        gap: 10px;
        padding: 22px;
      }
      code {
        border-radius: 6px;
        padding: 2px 6px;
        color: var(--amber);
        background: rgba(255,255,255,0.08);
      }
      @media (max-width: 980px) {
        header, .lens { grid-template-columns: 1fr; }
        .candidate-strip { grid-template-columns: 1fr; }
        .candidate-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .batch-strip { grid-template-columns: 1fr; }
        .stats { justify-content: start; }
        .shots { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
      @media (max-width: 640px) {
        .candidate-list { grid-template-columns: 1fr; }
        .shots { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <p class="eyebrow">LilyTravelAgent / Visual Review</p>
          <h1>Director Lens Comparison</h1>
        </div>
        <div class="stats">
          <span>${dashboard.totalDreamPacks} Dream packs</span>
          <span>${dashboard.comparedLensCount}/${directorLenses.length} lenses</span>
          <span>${dashboard.completeBatchCount}/${dashboard.batchCount} complete batches</span>
          <span>${dashboard.sceneCropCount} scene crops</span>
        </div>
      </header>
      ${missing}
      ${renderCandidateStrip(dashboard.bestRecordingCandidates)}
      ${renderBatchStrip(dashboard.currentBatch, dashboard.previousBatch)}
      <section class="stack">${lensCards}</section>
    </main>
  </body>
</html>`;
}

function renderCandidateStrip(candidates: LensRecordingCandidate[]) {
  if (!candidates.length) {
    return "";
  }

  const firstCandidate = candidates[0];
  const queueChips = candidates
    .map(
      (candidate) => `<a class="candidate-sequence-chip${candidate.rank === 1 ? " is-first" : ""}" href="${escapeHtml(candidate.dreamUrl)}" title="${escapeHtml(
        `Open #${candidate.rank} ${candidate.lensLabel} D${candidate.day}`,
      )}">
        <span>#${candidate.rank}</span>
        <small>${escapeHtml(`D${candidate.day}`)}</small>
      </a>`,
    )
    .join("");

  return `<section class="candidate-strip" aria-label="Best recording candidates">
    <div class="candidate-head">
      <span>Best Recording Candidates</span>
      <strong>Top changed scene crops</strong>
      <a class="candidate-primary" href="${escapeHtml(firstCandidate.dreamUrl)}">Open first candidate</a>
      <div class="candidate-sequence" aria-label="Recording queue sequence">${queueChips}</div>
    </div>
    <div class="candidate-list">
      ${candidates
        .map(
          (candidate) => `<a class="candidate-link" href="${escapeHtml(candidate.dreamUrl)}">
            <div class="candidate-thumb">
              <img src="${escapeHtml(candidate.sceneScreenshotUrl)}" alt="${escapeHtml(`${candidate.lensLabel} D${candidate.day} candidate 3D scene crop`)}" loading="lazy" />
            </div>
            <div class="candidate-copy">
              <span class="candidate-meta">#${candidate.rank} · ${escapeHtml(candidate.lensLabel)} · D${candidate.day}</span>
              <strong>${escapeHtml(candidate.dayLabel)}</strong>
              <small>${escapeHtml(`${candidate.diff.detail} · ${candidate.cue || "visual beat"}`)}</small>
            </div>
          </a>`,
        )
        .join("")}
    </div>
  </section>`;
}

function renderBatchStrip(currentBatch: LensComparisonBatch | null, previousBatch: LensComparisonBatch | null) {
  if (!currentBatch && !previousBatch) {
    return "";
  }

  return `<section class="batch-strip" aria-label="Before after batch summary">
    ${renderBatchPanel("Current", currentBatch)}
    ${renderBatchPanel("Previous", previousBatch)}
  </section>`;
}

function renderBatchPanel(label: string, batch: LensComparisonBatch | null) {
  if (!batch) {
    return `<div class="batch-panel">
      <span>${escapeHtml(label)}</span>
      <strong>No complete batch yet</strong>
      <small>Run <code>npm run check:dream-lenses</code> twice for before/after review.</small>
    </div>`;
  }

  return `<div class="batch-panel">
    <span>${escapeHtml(label)} Batch</span>
    <strong>${escapeHtml(batch.id)}</strong>
    <small>${escapeHtml(`${batch.packCount}/${directorLenses.length} lenses · ${batch.sceneCropCount} scene crops · ${batch.complete ? "complete" : `missing ${batch.missingLensIds.join(" / ")}`}`)}</small>
  </div>`;
}

function renderLensCard(pack: LensComparisonPack, previousPack?: LensComparisonPack) {
  const dayMap = new Map(pack.days.map((day) => [day.day, day]));
  const previousDayMap = new Map((previousPack?.days || []).map((day) => [day.day, day]));
  const shots = [1, 2, 3, 4]
    .map((day) => {
      const shot = dayMap.get(day);
      if (!shot) {
        return `
          <figure>
            <figcaption>
              <span>D${day}</span>
              <strong>Missing</strong>
              <small>Run QA again</small>
            </figcaption>
          </figure>`;
      }

      return renderShotFigure(pack, shot, day, previousDayMap.get(day));
    })
    .join("");

  return `
    <article class="lens ${escapeHtml(pack.lensId)}">
      <div class="lens-head">
        <div>
          <p>${escapeHtml(pack.demoRoadbook)} · ${escapeHtml(pack.createdAt)}</p>
          <h2>${escapeHtml(pack.lensLabel)}</h2>
          <strong>${escapeHtml(pack.tuningCue)}</strong>
          ${
            previousPack
              ? `<span class="before-after-note">${escapeHtml(`Before/after: ${previousPack.id} -> ${pack.id}`)}</span>`
              : `<span class="before-after-note">Current-only: run another complete batch for before/after.</span>`
          }
        </div>
        <div class="checklist">
          ${pack.checklist.map((item) => `<span class="${escapeHtml(item.state)}">${escapeHtml(item.label)} · ${escapeHtml(item.detail)}</span>`).join("")}
          <span>${pack.sourcePackCount} pack${pack.sourcePackCount > 1 ? "s" : ""}</span>
        </div>
        <div class="lens-links">
          <a href="/dream?demo=${escapeHtml(pack.demoRoadbook)}&amp;lens=${escapeHtml(pack.lensId)}">Open Dream</a>
          <code>${escapeHtml(pack.summaryPath)}</code>
          ${pack.notesPath ? `<code>${escapeHtml(pack.notesPath)}</code>` : ""}
        </div>
      </div>
      <div class="shots">${shots}</div>
    </article>`;
}

function renderShotFigure(pack: LensComparisonPack, shot: LensComparisonDay, day: number, previousShot?: LensComparisonDay) {
  const diff = compareLensSceneStats(shot, previousShot);
  const caption = `${shot.hasSceneCrop ? "3D crop" : "page frame"} · ${shot.cue || shot.compositionProof || "visual beat"}`;

  if (!previousShot) {
    return `
      <figure>
        <img src="${escapeHtml(shot.sceneScreenshotUrl)}" alt="${escapeHtml(`${pack.lensProof} D${day} current 3D scene crop`)}" loading="lazy" />
        <span class="diff-badge ${escapeHtml(diff.state)}">${escapeHtml(diff.label)}</span>
        <figcaption>
          <span>D${day}</span>
          <strong>${escapeHtml(shot.label)}</strong>
          <small>${escapeHtml(`${caption} · ${diff.detail}`)}</small>
        </figcaption>
      </figure>`;
  }

  return `
    <figure>
      <div class="frame-pair">
        <div class="frame current">
          <span class="frame-label">Current</span>
          <span class="diff-badge ${escapeHtml(diff.state)}">${escapeHtml(diff.label)}</span>
          <img src="${escapeHtml(shot.sceneScreenshotUrl)}" alt="${escapeHtml(`${pack.lensProof} D${day} current 3D scene crop`)}" loading="lazy" />
        </div>
        <div class="frame previous">
          <span class="frame-label">Previous</span>
          <img src="${escapeHtml(previousShot.sceneScreenshotUrl)}" alt="${escapeHtml(`${pack.lensProof} D${day} previous 3D scene crop`)}" loading="lazy" />
        </div>
      </div>
      <figcaption>
        <span>D${day}</span>
        <strong>${escapeHtml(shot.label)}</strong>
        <small>${escapeHtml(`${caption} · ${diff.detail}`)}</small>
      </figcaption>
    </figure>`;
}

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
