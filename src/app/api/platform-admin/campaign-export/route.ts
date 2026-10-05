import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/route-helpers";
import { buildCampaignCsv } from "@/lib/campaign-export";

// GET: platform admin exports campaign orders as CSV.
// Query params: tenant_id (required), team_id (optional), campaign_id (optional).
export async function GET(req: NextRequest) {
  try {
    const authError = requirePlatformAdmin(req);
    if (authError) {
      return NextResponse.json(authError, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenant_id");
    const teamId = searchParams.get("team_id") || undefined;
    const campaignId = searchParams.get("campaign_id") || undefined;

    if (!tenantId) {
      return NextResponse.json({ error: "tenant_id is required" }, { status: 400 });
    }

    const csv = await buildCampaignCsv(tenantId, teamId, campaignId);

    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="campaign-orders-${stamp}.csv"`,
      },
    });
  } catch (err) {
    console.error("admin campaign export error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
