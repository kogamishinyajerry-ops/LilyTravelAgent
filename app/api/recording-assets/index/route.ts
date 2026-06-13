import path from "node:path";
import { NextResponse } from "next/server";
import { listRecordingAssetPacks, readRecordingAssetsSummary } from "@/lib/recording-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const recordingsRoot = path.join(/*turbopackIgnore: true*/ process.cwd(), "recordings");

export async function GET() {
  const summary = await readRecordingAssetsSummary(recordingsRoot);
  if (!summary.indexAvailable) {
    return new NextResponse("Recording index is not available. Run npm run index:recording-assets first.", { status: 404 });
  }

  const packs = await listRecordingAssetPacks(recordingsRoot);
  return new NextResponse(buildRecordingIndexHtml(packs), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function buildRecordingIndexHtml(packs: Awaited<ReturnType<typeof listRecordingAssetPacks>>) {
  const cards = packs.length
    ? packs
        .map(
          (pack) => `
            <article>
              <p>${escapeHtml(pack.label)}</p>
              <h2>${escapeHtml(pack.title)}</h2>
              <small>${escapeHtml(pack.createdAt)}</small>
              <strong>${escapeHtml(pack.detail)}</strong>
              <code>recordings/${escapeHtml(pack.galleryPath)}</code>
              ${pack.notesPath ? `<code>recordings/${escapeHtml(pack.notesPath)}</code>` : ""}
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
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
      article { display: grid; gap: 9px; border: 1px solid rgba(47, 64, 56, 0.13); border-radius: 8px; padding: 16px; background: rgba(255, 255, 255, 0.72); box-shadow: 0 18px 42px rgba(40, 52, 47, 0.1); }
      article p, small { color: #66806f; font-size: 0.76rem; font-weight: 900; text-transform: uppercase; }
      h2 { font-size: 1.35rem; }
      strong { color: #34443c; }
      code { display: block; overflow: auto; border-radius: 8px; padding: 7px 9px; color: #284f42; background: rgba(255, 255, 255, 0.68); }
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
        <p>${packs.length} packs</p>
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
