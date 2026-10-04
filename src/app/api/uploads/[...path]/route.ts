import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
};

/**
 * Serves user-uploaded files from public/uploads.
 *
 * Next.js only serves files present in public/ at build time, so files written
 * at runtime (design references, designer submissions) 404 when requested as
 * static assets. This route streams them straight from disk instead.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;

    // Decode and reject any path traversal attempts.
    const decoded = segments.map((s) => decodeURIComponent(s));
    if (decoded.some((s) => s === ".." || s.includes("/") || s.includes("\\"))) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const filePath = path.join(UPLOADS_ROOT, ...decoded);

    // Ensure the resolved path stays inside the uploads root.
    const normalized = path.normalize(filePath);
    if (!normalized.startsWith(UPLOADS_ROOT + path.sep)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const fileStat = await stat(normalized).catch(() => null);
    if (!fileStat || !fileStat.isFile()) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const data = await readFile(normalized);
    const ext = path.extname(normalized).toLowerCase();
    const contentType = MIME_BY_EXT[ext] || "application/octet-stream";

    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileStat.size),
        "Content-Disposition": `inline; filename="${path.basename(normalized)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[uploads] serve error:", error);
    return NextResponse.json({ error: "Failed to serve file" }, { status: 500 });
  }
}
