import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { resolveRecordingAssetFile } from "@/lib/lens-comparison";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const recordingsRoot = path.join(/*turbopackIgnore: true*/ process.cwd(), "recordings");
const contentTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};
const allowedExtensions = Object.keys(contentTypes);

export async function GET(request: NextRequest) {
  const relativePath = request.nextUrl.searchParams.get("path") || "";
  const filePath = resolveRecordingAssetFile(recordingsRoot, relativePath, allowedExtensions);
  if (!filePath) {
    return new NextResponse("Recording asset file is not available.", { status: 404 });
  }

  try {
    const file = await readFile(filePath);
    return new NextResponse(file, {
      headers: {
        "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("Recording asset file is not available.", { status: 404 });
  }
}
