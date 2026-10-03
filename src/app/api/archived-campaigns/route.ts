import { NextRequest, NextResponse } from "next/server";
import {
  query, requireAdminSession} from "@/lib/db-async";

export async function GET(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) return NextResponse.json({ error: authError.error }, { status: 401 });

  try {
    const archives = await query<any>(
      `SELECT 
        id,
        campaign_name,
        campaign_number,
        archived_at,
        total_orders,
        total_items,
        total_revenue_usd,
        delete_at,
        created_at
      FROM archived_campaigns
      ORDER BY campaign_number DESC`,
      []
    );

    return NextResponse.json({
      success: true,
      archives,
      count: archives.length});
  } catch (error) {
    console.error("Error fetching archived campaigns:", error);
    return NextResponse.json({ error: "Failed to fetch archived campaigns" }, { status: 500 });
  }
}
