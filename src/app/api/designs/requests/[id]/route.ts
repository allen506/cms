import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db-async";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantSlug = request.headers.get("x-tenant-slug");

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get tenant ID
    const tenants = await query(
      "SELECT id FROM tenants WHERE slug = $1",
      [tenantSlug]
    );

    if (tenants.length === 0) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    const tenantId = tenants[0].id;

    // Get design request
    const designRequests = await query(
      `SELECT dr.*, ua.email as requester_email, t.name as team_name
       FROM design_requests dr
       LEFT JOIN user_accounts ua ON ua.id = dr.requester_id
       LEFT JOIN teams t ON t.id = dr.team_id
       WHERE dr.id = $1 AND dr.tenant_id = $2`,
      [id, tenantId]
    );

    if (designRequests.length === 0) {
      return NextResponse.json(
        { error: "Design request not found" },
        { status: 404 }
      );
    }

    const designRequest = designRequests[0];

    // Get attached files
    const files = await query(
      `SELECT id, filename as file_name, file_path as file_url, mime_type as file_type, uploaded_by, created_at
       FROM design_request_files
       WHERE design_request_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    // Get design submissions with files
    const submissions = await query(
      `SELECT ds.id, ds.design_request_id as request_id, ds.designer_id, ds.version_number as submission_number,
              ds.status, ds.submitted_at as created_at, ds.updated_at, da.full_name as designer_email
       FROM design_submissions ds
       LEFT JOIN designer_accounts da ON da.id = ds.designer_id
       WHERE ds.design_request_id = $1
       ORDER BY ds.version_number DESC`,
      [id]
    );

    // Get submission files for each submission
    const submissionsWithFiles = await Promise.all(
      submissions.map(async (submission) => {
        const submissionFiles = await query(
          `SELECT id, filename as file_name, file_path as file_url, mime_type as file_type
           FROM design_submission_files
           WHERE design_submission_id = $1
           ORDER BY created_at DESC`,
          [submission.id]
        );
        return {
          ...submission,
          files: submissionFiles,
        };
      })
    );

    // Get comments
    const comments = await query(
      `SELECT dc.id, dc.design_request_id as request_id, dc.commenter_id as user_id, dc.comment_text as comment,
              dc.created_at, ua.email as user_email
       FROM design_comments dc
       LEFT JOIN user_accounts ua ON ua.id = dc.commenter_id
       WHERE dc.design_request_id = $1
       ORDER BY dc.created_at ASC`,
      [id]
    );

    return NextResponse.json({
      success: true,
      request: designRequest,
      files,
      submissions: submissionsWithFiles,
      comments,
    });
  } catch (error) {
    console.error("Error fetching design request:", error);
    return NextResponse.json(
      { error: "Failed to fetch design request" },
      { status: 500 }
    );
  }
}
