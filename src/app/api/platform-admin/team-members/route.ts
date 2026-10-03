import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db-async";
import { requirePlatformAdmin } from "@/lib/route-helpers";

/** Get list of team members who have placed orders for a tenant */
export async function GET(request: NextRequest) {
  try {
    const authError = requirePlatformAdmin(request);
    if (authError) {
      return NextResponse.json(authError, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenant_id');

    if (!tenantId) {
      return NextResponse.json({ error: "tenant_id is required" }, { status: 400 });
    }

    // Get distinct team members who have placed orders
    const members = await query<{ user_name: string; user_email: string | null }>(
      `SELECT DISTINCT user_name, user_email
       FROM orders
       WHERE tenant_id = $1 AND user_name IS NOT NULL
       ORDER BY user_name ASC`,
      [tenantId]
    );

    return NextResponse.json(members);
  } catch (error) {
    console.error('Get team members error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
