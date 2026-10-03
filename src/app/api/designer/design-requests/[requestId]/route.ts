import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db-async";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
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

    // Get request details with all columns
    const requests = await query(
      `SELECT 
        dr.id,
        dr.title,
        dr.description,
        dr.status,
        dr.created_at,
        dr.updated_at,
        u.email as requester_email,
        t.name as team_name
       FROM design_requests dr
       LEFT JOIN user_accounts u ON dr.requester_id = u.id
       LEFT JOIN teams t ON dr.team_id = t.id
       WHERE dr.id = $1 AND dr.tenant_id = $2`,
      [requestId, tenantId]
    );

    if (requests.length === 0) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    const requestData = requests[0];

    // Get attached files with file_path for download
    const files = await query(
      `SELECT id, filename, file_size, file_path, mime_type FROM design_request_files 
       WHERE design_request_id = $1
       ORDER BY created_at DESC`,
      [requestId]
    );

    // Get submissions with file count
    const submissions = await query(
      `SELECT 
        ds.id, 
        ds.version_number, 
        ds.status, 
        ds.submitted_at, 
        ds.submission_notes,
        da.full_name as designer_name,
        COUNT(dsf.id) as file_count
       FROM design_submissions ds
       LEFT JOIN designer_accounts da ON ds.designer_id = da.id
       LEFT JOIN design_submission_files dsf ON ds.id = dsf.design_submission_id
       WHERE ds.design_request_id = $1
       GROUP BY ds.id, da.full_name
       ORDER BY ds.version_number DESC`,
      [requestId]
    );

    return NextResponse.json({
      success: true,
      request: {
        ...requestData,
        files: files.map(f => ({
          ...f,
          download_url: f.file_path ? `/api/designer/design-requests/${requestId}/download/${f.id}` : null
        })),
        submissions,
      },
    });
  } catch (error) {
    console.error("Get request error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch request" },
      { status: 500 }
    );
  }
}
