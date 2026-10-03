import { NextRequest, NextResponse } from "next/server";
import { query, requirePlatformAdmin } from "@/lib/db-async";

interface CaptainRequest {
  email: string;
  tenantId: string;
  isCaptain: boolean;
}

/** Update team captain status for a user */
export async function PATCH(request: NextRequest) {
  try {
    const authError = requirePlatformAdmin(request);
    if (authError) {
      return NextResponse.json(authError, { status: 401 });
    }

    const body: CaptainRequest = await request.json();
    const { email, tenantId, isCaptain } = body;

    if (!email || !tenantId) {
      return NextResponse.json(
        { error: "email and tenantId are required" },
        { status: 400 }
      );
    }

    // Update user captain status
    await query(
      `UPDATE user_accounts 
       SET is_team_captain = $1 
       WHERE email = $2 AND tenant_id = $3`,
      [isCaptain ? 1 : 0, email, tenantId]
    );

    // Verify the update
    const user = await query<any>(
      `SELECT id, email, is_team_captain 
       FROM user_accounts 
       WHERE email = $1 AND tenant_id = $2`,
      [email, tenantId]
    );

    if (user.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User ${email} captain status set to ${isCaptain}`,
      user: {
        id: user[0].id,
        email: user[0].email,
        isCaptain: user[0].is_team_captain === 1 || user[0].is_team_captain === true}});
  } catch (error) {
    console.error("Update team captain error:", error);
    return NextResponse.json(
      {
        error: "Failed to update team captain status",
        ,
      { status: 500 }
    );
  }
}

/** Get list of team members for a tenant */
export async function GET(request: NextRequest) {
  try {
    const authError = requirePlatformAdmin(request);
    if (authError) {
      return NextResponse.json(authError, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get("tenant_id");

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenant_id is required" },
        { status: 400 }
      );
    }

    // Get all users for this tenant
    const users = await query<any>(
      `SELECT id, email, is_team_captain, created_at
       FROM user_accounts
       WHERE tenant_id = $1
       ORDER BY email ASC`,
      [tenantId]
    );

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        isCaptain: u.is_team_captain === 1 || u.is_team_captain === true,
        createdAt: u.created_at}))});
  } catch (error) {
    console.error("Get team members error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch team members",
        ,
      { status: 500 }
    );
  }
}
