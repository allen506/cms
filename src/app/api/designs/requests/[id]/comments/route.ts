import { NextRequest, NextResponse } from "next/server";
import { execute, query, queryOne } from "@/lib/db-async";
import { extractContext, requireAuth } from "@/lib/route-helpers";
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

    // Verify user has access (requester or team member)
    const user = await queryOne<{ team_id: string; user_role: string }>(
      "SELECT team_id, user_role FROM user_accounts WHERE id = ?",
      [ctx.userId]
    );

    if (
      user?.user_role !== "admin" &&
      designRequest.requester_id !== ctx.userId &&
      user?.team_id !== designRequest.team_id
    ) {
      return NextResponse.json({ error: "Access denied to this design request" }, { status: 403 });
    }

    const { comment } = await request.json();

    if (!comment || comment.trim().length === 0) {
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    }

    const commentId = uuidv4();

    await execute(
      `INSERT INTO design_comments (id, request_id, user_id, comment, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [commentId, id, ctx.userId, comment]
    );

    return NextResponse.json(
      {
        success: true,
        commentId,
        message: "Comment added successfully"},
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding comment:", error);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
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

    // Get comments with access control
    const comments = await query<any>(
      `SELECT dc.id, dc.request_id, dc.user_id, dc.comment, dc.created_at,
        ua.email as user_email
       FROM design_comments dc
       LEFT JOIN user_accounts ua ON ua.id = dc.user_id
       WHERE dc.request_id = ?
       ORDER BY dc.created_at ASC`,
      [id]
    );

    return NextResponse.json({
      success: true,
      comments,
      count: comments.length});
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}
