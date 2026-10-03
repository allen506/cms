import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db-async";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantSlug = request.headers.get("x-tenant-slug");

    console.log("[designs/requests/[id]] Fetching request:", { id, tenantSlug });

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get tenant ID
    console.log("[designs/requests/[id]] Querying tenants table...");
    const tenants = await query(
      "SELECT id FROM tenants WHERE slug = $1",
      [tenantSlug]
    );
    console.log("[designs/requests/[id]] Tenants query result:", tenants.length);

    if (tenants.length === 0) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    const tenantId = tenants[0].id;
    console.log("[designs/requests/[id]] Using tenant ID:", tenantId);

    // Get design request
    console.log("[designs/requests/[id]] Querying design_requests table...");
    const designRequests = await query(
      `SELECT dr.*, ua.email as requester_email, t.name as team_name
       FROM design_requests dr
       LEFT JOIN user_accounts ua ON ua.id = dr.requester_id
       LEFT JOIN teams t ON t.id = dr.team_id
       WHERE dr.id = $1 AND dr.tenant_id = $2`,
      [id, tenantId]
    );
    console.log("[designs/requests/[id]] Design requests query result:", designRequests.length);

    if (designRequests.length === 0) {
      return NextResponse.json(
        { error: "Design request not found" },
        { status: 404 }
      );
    }

    const designRequest = designRequests[0];
    console.log("[designs/requests/[id]] Got design request, fetching files...");

    // Get attached files
    const files = await query(
      `SELECT id, file_name, file_path as file_url, file_type, uploaded_by, created_at
       FROM design_request_files
       WHERE design_request_id = $1
       ORDER BY created_at DESC`,
      [id]
    );
    console.log("[designs/requests/[id]] Files query result:", files.length);

    // Get design submissions with files
    console.log("[designs/requests/[id]] Querying design_submissions...");
    const submissions = await query(
      `SELECT ds.id, ds.design_request_id as request_id, ds.designer_id, ds.submission_number,
              ds.status, ds.created_at, ds.updated_at, ua.email as designer_email
       FROM design_submissions ds
       LEFT JOIN user_accounts ua ON ua.id = ds.designer_id
       WHERE ds.design_request_id = $1
       ORDER BY ds.submission_number DESC`,
      [id]
    );
    console.log("[designs/requests/[id]] Submissions query result:", submissions.length);

    // Get submission files for each submission
    console.log("[designs/requests/[id]] Fetching files for", submissions.length, 'submissions...');
    const submissionsWithFiles = await Promise.all(
      submissions.map(async (submission) => {
        const submissionFiles = await query(
          `SELECT id, file_name, file_path as file_url, file_type
           FROM design_submission_files
           WHERE submission_id = $1
           ORDER BY created_at DESC`,
          [submission.id]
        );
        return {
          ...submission,
          files: submissionFiles,
        };
      })
    );
    console.log("[designs/requests/[id]] Submission files fetched successfully");

    // Get comments
    console.log("[designs/requests/[id]] Querying design_comments...");
    const comments = await query(
      `SELECT dc.id, dc.design_request_id as request_id, dc.user_id, dc.comment,
              dc.created_at, ua.email as user_email
       FROM design_comments dc
       LEFT JOIN user_accounts ua ON ua.id = dc.user_id
       WHERE dc.design_request_id = $1
       ORDER BY dc.created_at ASC`,
      [id]
    );
    console.log("[designs/requests/[id]] Comments query result:", comments.length);

    console.log("[designs/requests/[id]] All queries successful, returning response");
    return NextResponse.json({
      success: true,
      request: designRequest,
      files,
      submissions: submissionsWithFiles,
      comments,
    });
  } catch (error) {
    console.error("[designs/requests/[id]] ❌ Error fetching design request:", error);
    if (error instanceof Error) {
      console.error("[designs/requests/[id]] Error message:", error.message);
      console.error("[designs/requests/[id]] Error stack:", error.stack);
    }
    
    const errorDetails = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { 
        error: "Failed to fetch design request",
        details: errorDetails,
        env: process.env.NODE_ENV
      },
      { status: 500 }
    );
  }
}
