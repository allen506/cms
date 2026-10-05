import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db-async";
import {
  getCurrentCampaign,
  isTeamOrderingOpen,
  closeCampaign,
  reopenCampaign,
  submitCampaign,
  setCampaignBacLink,
} from "@/lib/campaigns";
import { getCampaignOrderRows } from "@/lib/campaign-export";

interface Caller {
  tenantId: string;
  userId: string;
  teamId: string | null;
  isCaptain: boolean;
}

async function resolveCaller(req: NextRequest): Promise<Caller | NextResponse> {
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
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return {
    tenantId: tenant.id,
    userId,
    teamId: user.team_id ?? null,
    isCaptain: user.is_team_captain === 1 || user.is_team_captain === true,
  };
}

// GET: current campaign + whether ordering is open for the caller's team.
export async function GET(req: NextRequest) {
  try {
    const caller = await resolveCaller(req);
    if (caller instanceof NextResponse) return caller;
    if (!caller.teamId) {
      return NextResponse.json({ campaign: null, orderingOpen: true });
    }

    const campaign = await getCurrentCampaign(caller.tenantId, caller.teamId);
    const orderingOpen = await isTeamOrderingOpen(caller.tenantId, caller.teamId);
    const rows = await getCampaignOrderRows(
      caller.tenantId,
      caller.teamId,
      campaign?.id
    );

    const totals = rows.reduce(
      (acc, r) => {
        acc.quantity += Number(r.quantity) || 0;
        acc.usd += (Number(r.price_usd) || 0) * (Number(r.quantity) || 0);
        acc.crc += (Number(r.price_crc) || 0) * (Number(r.quantity) || 0);
        return acc;
      },
      { quantity: 0, usd: 0, crc: 0 }
    );

    return NextResponse.json({
      campaign,
      orderingOpen,
      isCaptain: caller.isCaptain,
      orders: rows,
      totals,
    });
  } catch (err) {
    console.error("campaign GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: captain actions — close | reopen | submit | set-bac-link.
export async function POST(req: NextRequest) {
  try {
    const caller = await resolveCaller(req);
    if (caller instanceof NextResponse) return caller;

    if (!caller.isCaptain) {
      return NextResponse.json(
        { error: "Only team captains can manage the campaign" },
        { status: 403 }
      );
    }
    if (!caller.teamId) {
      return NextResponse.json({ error: "No team assigned" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    switch (action) {
      case "close": {
        const campaign = await closeCampaign(caller.tenantId, caller.teamId, caller.userId);
        if (!campaign) {
          return NextResponse.json(
            { error: "No open campaign to close" },
            { status: 400 }
          );
        }
        return NextResponse.json({ campaign });
      }
      case "reopen": {
        const current = await getCurrentCampaign(caller.tenantId, caller.teamId);
        if (!current) {
          return NextResponse.json({ error: "No campaign found" }, { status: 400 });
        }
        const campaign = await reopenCampaign(caller.tenantId, current.id);
        if (!campaign) {
          return NextResponse.json(
            { error: "Campaign cannot be re-opened" },
            { status: 400 }
          );
        }
        return NextResponse.json({ campaign });
      }
      case "submit": {
        const current = await getCurrentCampaign(caller.tenantId, caller.teamId);
        if (!current) {
          return NextResponse.json({ error: "No campaign found" }, { status: 400 });
        }
        if (current.status === "open") {
          return NextResponse.json(
            { error: "Close the campaign before submitting" },
            { status: 400 }
          );
        }
        const campaign = await submitCampaign(caller.tenantId, current.id);
        return NextResponse.json({ campaign });
      }
      case "set-bac-link": {
        const current = await getCurrentCampaign(caller.tenantId, caller.teamId);
        if (!current) {
          return NextResponse.json({ error: "No campaign found" }, { status: 400 });
        }
        const link = typeof body.link === "string" ? body.link.trim() : null;
        const campaign = await setCampaignBacLink(
          caller.tenantId,
          current.id,
          link || null
        );
        return NextResponse.json({ campaign });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error("campaign POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
