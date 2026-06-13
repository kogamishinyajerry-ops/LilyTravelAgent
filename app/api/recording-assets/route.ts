import { NextResponse } from "next/server";
import path from "node:path";
import { readRecordingAssetsSummary } from "@/lib/recording-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const summary = await readRecordingAssetsSummary(path.join(/*turbopackIgnore: true*/ process.cwd(), "recordings"));
  return NextResponse.json({
    ok: true,
    ...summary,
    indexUrl: summary.indexAvailable ? "/api/recording-assets/index" : "",
  });
}
