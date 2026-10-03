import { NextRequest, NextResponse } from "next/server";
import {
  queryOne,
  query,
  execute,
  extractContext,
  requireAuth} from "@/lib/db-async";
import { v4 as uuidv4 } from "uuid";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = extractContext(request);
    const { id } = await params;

    // Require auth
    const authError = requireAuth(ctx);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: 401 });
    }

    // Get tenant ID
    const tenant = await queryOne<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = ?",
      [ctx.tenantSlug]
    );
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Verify request exists
    const designRequest = await queryOne<any>(
      "SELECT * FROM design_requests WHERE id = ? AND tenant_id = ?",
      [id, tenant.id]
    );

    if (!designRequest) {
      return NextResponse.json({ error: "Design request not found" }, { status: 404 });
    }

    // Only requester can upload to their request
    if (designRequest.requester_id !== ctx.userId) {
      return NextResponse.json(
        { error: "Only the requester can upload files" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadedFiles = [];

    for (const file of files) {
      // In production, upload to cloud storage (S3, etc)
      // For now, store file metadata only
      const fileId = uuidv4();
      const fileName = file.name;
      const fileType = file.type;
      const fileUrl = `/uploads/design-requests/${id}/${fileName}`;

      await execute(
        `INSERT INTO design_request_files
          (id, request_id, file_url, file_name, file_type, uploaded_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [fileId, id, fileUrl, fileName, fileType, ctx.userId]
      );

      uploadedFiles.push({
        fileId,
        fileName,
        fileType,
        fileUrl});
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: "Failed to upload files" }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        uploadedFiles,
        message: `${uploadedFiles.length} file(s) uploaded successfully`},
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading files:", error);
    return NextResponse.json({ error: "Failed to upload files" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = extractContext(request);
    const { id } = await params;

    // Require auth
    const authError = requireAuth(ctx);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: 401 });
    }

    // Get tenant ID
    const tenant = await queryOne<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = ?",
      [ctx.tenantSlug]
    );
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Get files
    const files = await query<any>(
      `SELECT id, file_url, file_name, file_type, uploaded_by, created_at
       FROM design_request_files
       WHERE request_id = ?
       ORDER BY created_at DESC`,
      [id]
    );

    return NextResponse.json({
      success: true,
      files,
      count: files.length});
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}
