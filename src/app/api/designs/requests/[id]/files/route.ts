import { NextRequest, NextResponse } from "next/server";
import {
  queryOne,
  query,
  execute,
  extractContext,
  requireAuth} from "@/lib/route-helpers";
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
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'image/gif', 'image/webp'];

    for (const file of files) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds 50MB limit` },
          { status: 400 }
        );
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File type ${file.type} not allowed. Allowed types: images and PDF` },
          { status: 400 }
        );
      }

      // Sanitize filename
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      if (!sanitizedName || sanitizedName.length === 0) {
        return NextResponse.json(
          { error: "Invalid filename" },
          { status: 400 }
        );
      }

      // In production, upload to cloud storage (S3, etc)
      // For now, store file metadata only
      const fileId = uuidv4();
      const fileUrl = `/uploads/design-requests/${id}/${sanitizedName}`;

      await execute(
        `INSERT INTO design_request_files
          (id, request_id, file_url, file_name, file_type, uploaded_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [fileId, id, fileUrl, sanitizedName, file.type, ctx.userId]
      );

      uploadedFiles.push({
        fileId,
        fileName: sanitizedName,
        fileType: file.type,
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

    // Get files - verify request belongs to tenant
    const designRequest = await queryOne<any>(
      "SELECT id FROM design_requests WHERE id = ? AND tenant_id = ?",
      [id, tenant.id]
    );
    
    if (!designRequest) {
      return NextResponse.json({ error: "Design request not found" }, { status: 404 });
    }

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
