import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db-async";
import { getCurrentCampaign } from "@/lib/campaigns";
import { buildCampaignCsv } from "@/lib/campaign-export";

// GET: team captain downloads a CSV of their team's campaign orders.
export async function GET(req: NextRequest) {
  try {
    const tenantSlug = req.headers.get("x-tenant-slug");
    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const tenant = await queryOne<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = ?",
      [tenantSlug.toLowerCase()]
    );
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const userId =
      req.headers.get("x-user-id") || req.cookies.get("tenant_user_id")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await queryOne<{ team_id: string | null; is_team_captain: number | boolean }>(
      "SELECT team_id, is_team_captain FROM user_accounts WHERE id = ? AND tenant_id = ?",
      [userId, tenant.id]
    );
    const isCaptain = user?.is_team_captain === 1 || user?.is_team_captain === true;
    if (!user || !isCaptain) {
      return NextResponse.json(
        { error: "Only team captains can export the campaign" },
        { status: 403 }
      );
    }
    if (!user.team_id) {
      return NextResponse.json({ error: "No team assigned" }, { status: 400 });
    }

    const current = await getCurrentCampaign(tenant.id, user.team_id);
    const csv = await buildCampaignCsv(tenant.id, user.team_id, current?.id);

    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="campaign-orders-${stamp}.csv"`,
      },
    });
  } catch (err) {
    console.error("campaign export error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
