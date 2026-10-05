import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db-async";
import { requirePlatformAdmin } from "@/lib/route-helpers";
import {
  getCampaignById,
  closeCampaign,
  reopenCampaign,
  submitCampaign,
  setCampaignBacLink,
  markCampaignPaid,
} from "@/lib/campaigns";
import { getCampaignOrderRows } from "@/lib/campaign-export";

interface CampaignSummary {
  id: string;
  team_id: string;
  name: string | null;
  status: string;
  bac_payment_link: string | null;
  created_at: string;
  closed_at: string | null;
  submitted_at: string | null;
  paid_at: string | null;
  line_items: number;
  total_qty: number;
}

// GET: list campaigns for a tenant, or order rows for a specific campaign.
// Params: tenant_id (required), campaign_id (optional — returns that campaign's rows).
export async function GET(req: NextRequest) {
  const authError = requirePlatformAdmin(req);
  if (authError) return NextResponse.json(authError, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenant_id");
  const teamId = searchParams.get("team_id");
  const campaignId = searchParams.get("campaign_id");

  if (!tenantId) {
    return NextResponse.json({ error: "tenant_id is required" }, { status: 400 });
  }

  try {
    if (campaignId) {
      const campaign = await getCampaignById(campaignId, tenantId);
      if (!campaign) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
      if (teamId && campaign.team_id !== teamId) {
        return NextResponse.json({ error: "Campaign not found for team" }, { status: 404 });
      }
      const orders = await getCampaignOrderRows(
        tenantId,
        campaign.team_id,
        campaign.id
      );
      return NextResponse.json({ campaign, orders });
    }

    const filters: string[] = ["c.tenant_id = ?"];
    const params: string[] = [tenantId];
    if (teamId) {
      filters.push("c.team_id = ?");
      params.push(teamId);
    }

    const campaigns = await query<CampaignSummary>(
      `SELECT
          c.id, c.team_id, c.name, c.status, c.bac_payment_link,
          c.created_at, c.closed_at, c.submitted_at, c.paid_at,
          COUNT(oi.id)                     AS line_items,
          COALESCE(SUM(oi.quantity), 0)    AS total_qty
        FROM team_campaigns c
        LEFT JOIN orders o      ON o.campaign_id = c.id
        LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE ${filters.join(" AND ")}
       GROUP BY c.id, c.team_id, c.name, c.status, c.bac_payment_link,
                c.created_at, c.closed_at, c.submitted_at, c.paid_at
       ORDER BY c.created_at DESC`,
      params
    );
    return NextResponse.json({ campaigns });
  } catch (err) {
    console.error("admin campaigns GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: admin acts on any campaign — close | reopen | submit | mark-paid | set-bac-link.
export async function POST(req: NextRequest) {
  const authError = requirePlatformAdmin(req);
  if (authError) return NextResponse.json(authError, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const { tenant_id: tenantId, campaign_id: campaignId, action } = body;

    if (!tenantId || !campaignId || !action) {
      return NextResponse.json(
        { error: "tenant_id, campaign_id and action are required" },
        { status: 400 }
      );
    }

    const campaign = await getCampaignById(campaignId, tenantId);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    switch (action) {
      case "close": {
        const updated = await closeCampaign(tenantId, campaign.team_id, null);
        return NextResponse.json({ campaign: updated });
      }
      case "reopen": {
        const updated = await reopenCampaign(tenantId, campaignId);
        return NextResponse.json({ campaign: updated });
      }
      case "submit": {
        const updated = await submitCampaign(tenantId, campaignId);
        return NextResponse.json({ campaign: updated });
      }
      case "mark-paid": {
        const updated = await markCampaignPaid(tenantId, campaignId);
        return NextResponse.json({ campaign: updated });
      }
      case "set-bac-link": {
        const link = typeof body.link === "string" ? body.link.trim() : null;
        const updated = await setCampaignBacLink(tenantId, campaignId, link || null);
        return NextResponse.json({ campaign: updated });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error("admin campaigns POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
