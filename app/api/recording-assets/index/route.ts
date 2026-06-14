import path from "node:path";
import { NextResponse } from "next/server";
import { getRecordingAssetTypeLabel, getRecordingAssetUsageHint, type RecordingAssetType } from "@/lib/recording-asset-labels";
import {
  listRecordingAssetPacks,
  readRecordingAssetsSummary,
} from "@/lib/recording-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const recordingsRoot = path.join(/*turbopackIgnore: true*/ process.cwd(), "recordings");

export async function GET() {
  const summary = await readRecordingAssetsSummary(recordingsRoot);
  if (!summary.indexAvailable) {
    return new NextResponse("Recording index is not available. Run npm run index:recording-assets first.", { status: 404 });
  }

  const packs = await listRecordingAssetPacks(recordingsRoot);
  return new NextResponse(buildRecordingIndexHtml(packs, summary.countsByType), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function buildRecordingIndexHtml(
  packs: Awaited<ReturnType<typeof listRecordingAssetPacks>>,
  countsByType: Record<RecordingAssetType, number>,
) {
  const cards = packs.length
    ? packs
        .map(
          (pack) => `
            <article class="${escapeHtml(pack.type)}">
              <p><span>${escapeHtml(getRecordingAssetTypeLabel(pack.type))}</span>${escapeHtml(pack.label)}</p>
              <h2>${escapeHtml(pack.title)}</h2>
              <small>${escapeHtml(pack.createdAt)}</small>
              <em>${escapeHtml(getRecordingAssetUsageHint(pack.type))}</em>
              <strong>${escapeHtml(pack.detail)}</strong>
              <code>recordings/${escapeHtml(pack.galleryPath)}</code>
              ${pack.notesPath ? `<code>recordings/${escapeHtml(pack.notesPath)}</code>` : ""}
              ${pack.visualProof ? `
                <div class="visual-proof">
                  <span>Dream Proof · ${escapeHtml(pack.visualProof.finalCueLabel)} · ${escapeHtml(pack.visualProof.finalCueValue)}</span>
                  <nav>
                    ${pack.visualProof.screenshotPath ? `<a href="${escapeHtml(buildRecordingFileUrl(pack.visualProof.screenshotPath))}">playback screenshot</a>` : ""}
                    <a href="${escapeHtml(buildRecordingFileUrl(pack.visualProof.summaryPath))}">summary</a>
                    ${pack.visualProof.notesPath ? `<a href="${escapeHtml(buildRecordingFileUrl(pack.visualProof.notesPath))}">notes</a>` : ""}
                  </nav>
                </div>` : ""}
            </article>`,
        )
        .join("")
    : `<article><p>No recording QA packs found yet.</p><h2>Run npm run check:recording-suite</h2></article>`;

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>LilyTravelAgent Recording Assets</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; color: #24312d; background: #e8ebe4; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      main { width: min(1180px, calc(100vw - 32px)); margin: 0 auto; padding: 30px 0 44px; }
      h1, h2, p { margin: 0; }
      header { display: flex; align-items: end; justify-content: space-between; gap: 18px; margin-bottom: 18px; }
      h1 { font-size: clamp(2rem, 4vw, 3.6rem); line-height: 0.95; }
      .counts { display: flex; flex-wrap: wrap; justify-content: end; gap: 8px; }
      .counts span { border: 1px solid rgba(47, 64, 56, 0.14); border-radius: 999px; padding: 7px 10px; color: #284f42; font-size: 0.82rem; font-weight: 900; background: rgba(255,255,255,0.62); }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
      article { display: grid; gap: 9px; border: 1px solid rgba(47, 64, 56, 0.13); border-radius: 8px; padding: 16px; background: rgba(255, 255, 255, 0.72); box-shadow: 0 18px 42px rgba(40, 52, 47, 0.1); }
      article.studio { border-left: 5px solid #d66b3d; }
      article.dream { border-left: 5px solid #4f8f7a; }
      article.bridge { border-left: 5px solid #6c7bd9; }
      article p, small { color: #66806f; font-size: 0.76rem; font-weight: 900; text-transform: uppercase; }
      article p { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
      article p span, em { border-radius: 999px; padding: 3px 7px; color: #fff; font-style: normal; background: #4f8f7a; }
      article.studio p span { background: #d66b3d; }
      article.bridge p span { background: #6c7bd9; }
      em { justify-self: start; color: #284f42; background: rgba(79, 143, 122, 0.14); font-size: 0.78rem; font-weight: 900; }
      article.studio em { color: #7a3c24; background: rgba(214, 107, 61, 0.14); }
      article.bridge em { color: #384276; background: rgba(108, 123, 217, 0.14); }
      h2 { font-size: 1.35rem; }
      strong { color: #34443c; }
      code { display: block; overflow: auto; border-radius: 8px; padding: 7px 9px; color: #284f42; background: rgba(255, 255, 255, 0.68); }
      .visual-proof { display: grid; gap: 7px; border: 1px solid rgba(79, 143, 122, 0.2); border-radius: 8px; padding: 9px; background: rgba(79, 143, 122, 0.1); }
      .visual-proof span { color: #284f42; font-size: 0.82rem; font-weight: 950; }
      .visual-proof nav { display: flex; flex-wrap: wrap; gap: 6px; }
      .visual-proof a { border-radius: 999px; padding: 5px 8px; color: #fff; font-size: 0.74rem; font-weight: 900; text-decoration: none; background: #4f8f7a; }
      @media (max-width: 860px) { header, .grid { display: block; } article + article { margin-top: 12px; } }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <p>LilyTravelAgent</p>
          <h1>Recording Assets</h1>
        </div>
        <div class="counts">
          <span>${packs.length} packs</span>
          <span>Dream ${countsByType.dream}</span>
          <span>Studio ${countsByType.studio}</span>
          <span>Bridge ${countsByType.bridge}</span>
        </div>
      </header>
      <section class="grid">${cards}</section>
    </main>
  </body>
</html>
`;
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildRecordingFileUrl(relativePath: string) {
  return `/api/recording-assets/file?path=${encodeURIComponent(relativePath)}`;
}
