import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db-async";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string; fileId: string }> }
) {
  try {
    const { requestId, fileId } = await params;
    const designerId = request.cookies.get("designer_id")?.value;

    if (!designerId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get designer's tenant
    const designers = await query(
      "SELECT tenant_id FROM designer_accounts WHERE id = $1",
      [designerId]
    );

    if (designers.length === 0) {
      return NextResponse.json(
        { error: "Designer not found" },
        { status: 404 }
      );
    }

    const tenantId = designers[0].tenant_id;

    // Verify design request exists and belongs to designer's tenant
    const requests = await query(
      "SELECT id FROM design_requests WHERE id = $1 AND tenant_id = $2",
      [requestId, tenantId]
    );

    if (requests.length === 0) {
      return NextResponse.json(
        { error: "Design request not found" },
        { status: 404 }
      );
    }

    // Get file info
    const files = await query(
      `SELECT id, filename, file_path, mime_type FROM design_request_files 
       WHERE id = $1 AND design_request_id = $2`,
      [fileId, requestId]
    );

    if (files.length === 0) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    const file = files[0];

    // Construct full file path
    const filePath = path.join(process.cwd(), "public", file.file_path);

    try {
      // Read file from disk
      const fileBuffer = await readFile(filePath);

      // Return file with appropriate headers
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": file.mime_type || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${file.filename}"`,
          "Content-Length": fileBuffer.length.toString()}});
    } catch (readError) {
      console.error(`File not found on disk: ${filePath}`, readError);
      return NextResponse.json(
        { error: "File not available for download" },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to download file"},
      { status: 500 }
    );
  }
}
