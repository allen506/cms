import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db-async";

export async function GET(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
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

    // Get request details
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
      [params.requestId, tenantId]
    );

    if (requests.length === 0) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    const requestData = requests[0];

    // Get attached files
    const files = await query(
      `SELECT id, filename, file_size FROM design_request_files 
       WHERE design_request_id = $1
       ORDER BY created_at DESC`,
      [params.requestId]
    );

    // Get submissions
    const submissions = await query(
      `SELECT id, version_number, status, submitted_at, submission_notes 
       FROM design_submissions 
       WHERE design_request_id = $1
       ORDER BY version_number DESC`,
      [params.requestId]
    );

    return NextResponse.json({
      success: true,
      request: {
        ...requestData,
        files,
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
