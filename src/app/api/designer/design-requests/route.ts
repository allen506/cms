import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db-async";

export async function GET(request: NextRequest) {
  try {
    const designerId = request.cookies.get("designer_id")?.value;

    if (!designerId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get designer info (CMS designers serve all customer teams)
    const designers = await query(
      "SELECT id FROM designer_accounts WHERE id = $1 AND active = true",
      [designerId]
    );

    if (designers.length === 0) {
      return NextResponse.json(
        { error: "Designer not found" },
        { status: 404 }
      );
    }

    // Get all pending design requests across every customer team
    const requests = await query(
      `SELECT 
        dr.id,
        dr.title,
        dr.description,
        dr.status,
        dr.created_at,
        dr.updated_at,
        u.email as requester_email,
        t.name as team_name,
        (SELECT COUNT(*) FROM design_submissions WHERE design_request_id = dr.id) as submission_count
       FROM design_requests dr
       LEFT JOIN user_accounts u ON dr.requester_id = u.id
       LEFT JOIN teams t ON dr.team_id = t.id
       ORDER BY dr.created_at DESC`
    );

    return NextResponse.json({
      success: true,
      requests,
      count: requests.length});
  } catch (error) {
    console.error("Get design requests error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch requests" },
      { status: 500 }
    );
  }
}
