import { NextRequest, NextResponse } from "next/server";
import { execute, query, queryOne } from "@/lib/db-async";
import { extractContext, requireAuth } from "@/lib/route-helpers";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const ctx = extractContext(request);

    // Require auth
    const authError = requireAuth(ctx);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: 401 });
    }

    // Get tenant ID from slug
    const tenant = await queryOne<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = ?",
      [ctx.tenantSlug]
    );
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    let sql = `
      SELECT 
        dr.id,
        dr.title,
        dr.description,
        dr.status,
        dr.requester_id,
        dr.team_id,
        dr.created_at,
        dr.updated_at,
        COUNT(DISTINCT drf.id) as file_count,
        COUNT(DISTINCT ds.id) as submission_count,
        ua.email as requester_email
      FROM design_requests dr
      LEFT JOIN design_request_files drf ON drf.design_request_id = dr.id
      LEFT JOIN design_submissions ds ON ds.design_request_id = dr.id
      LEFT JOIN user_accounts ua ON ua.id = dr.requester_id
      WHERE dr.tenant_id = ?
    `;

    const params: any[] = [tenant.id];

    // Filter by role:
    // - Regular users see only their own requests
    // - Team captains see requests from their team
    // - Admins see all
    if (ctx.userRole !== "admin") {
      sql += ` AND (dr.requester_id = ? OR dr.team_id IN (
        SELECT team_id FROM user_accounts WHERE id = ?
      ))`;
      params.push(ctx.userId, ctx.userId);
    }

    sql += ` GROUP BY dr.id, dr.title, dr.description, dr.status, dr.requester_id, dr.team_id, dr.created_at, dr.updated_at, ua.email ORDER BY dr.created_at DESC`;

    console.log("Executing design requests query:", { tenantSlug: ctx.tenantSlug, userId: ctx.userId, userRole: ctx.userRole });
    const requests = await query<any>(sql, params);
    console.log("Design requests query succeeded, count:", requests.length);

    return NextResponse.json({
      success: true,
      requests,
      count: requests.length});
  } catch (error) {
    console.error("Error fetching design requests:", error);
    return NextResponse.json({ error: `Failed to fetch design requests: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = extractContext(request);

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

    // Verify user is team captain
    const user = await queryOne<{
      is_team_captain: number;
      team_id: string;
    }>(
      "SELECT is_team_captain, team_id FROM user_accounts WHERE id = ? AND tenant_id = ?",
      [ctx.userId, tenant.id]
    );

    if (!user || !user.is_team_captain) {
      return NextResponse.json({ error: "Only team captains can request designs" }, { status: 403 });
    }

    const { title, description, unlockCategory } = await request.json();

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

    const validCategories = ["enduro-jersey", "cycling-jersey", "bib-licra"];
    const category =
      unlockCategory && validCategories.includes(unlockCategory)
        ? unlockCategory
        : null;

    const id = uuidv4();

    const result = await execute(
      `
      INSERT INTO design_requests 
        (id, tenant_id, title, description, requester_id, team_id, status, unlock_category, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `,
      [id, tenant.id, title, description, ctx.userId, user.team_id, "pending", category]
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: "Failed to create design request" }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        requestId: id,
        message: "Design request created successfully"},
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating design request:", error);
    return NextResponse.json({ error: "Failed to create design request" }, { status: 500 });
  }
}
