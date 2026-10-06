import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db-async";
import { requirePlatformAdmin } from "@/lib/route-helpers";
import { v4 as uuidv4 } from "uuid";

// Resolve the team that belongs to a tenant (one team per tenant here).
async function resolveTeamId(tenantId: string): Promise<string | null> {
  const team = await queryOne<{ id: string }>(
    "SELECT id FROM teams WHERE tenant_id = ? ORDER BY created_at LIMIT 1",
    [tenantId]
  );
  return team?.id ?? null;
}

// GET: tenant's designs with assignment status for its team.
export async function GET(req: NextRequest) {
  const authError = requirePlatformAdmin(req);
  if (authError) return NextResponse.json(authError, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenant_id");
  if (!tenantId) {
    return NextResponse.json({ error: "tenant_id is required" }, { status: 400 });
  }

  try {
    const teamId = await resolveTeamId(tenantId);

    const designs = await query<{
      id: string;
      name: string;
      image_url: string | null;
      assigned_category: string | null;
      assigned: boolean;
    }>(
      `SELECT d.id, d.name, d.image_url,
              td.category AS assigned_category,
              (td.id IS NOT NULL) AS assigned
         FROM designs d
         LEFT JOIN team_designs td
           ON td.design_id = d.id AND td.team_id = ?
        WHERE d.tenant_id = ? AND d.active = 1
        ORDER BY d.sort_order, d.name`,
      [teamId, tenantId]
    );

    return NextResponse.json({ teamId, designs });
  } catch (err) {
    console.error("team-designs GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: assign | unassign | set-category for a design on the tenant's team.
export async function POST(req: NextRequest) {
  const authError = requirePlatformAdmin(req);
  if (authError) return NextResponse.json(authError, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const { tenant_id: tenantId, design_id: designId, action } = body;
    const category =
      typeof body.category === "string" && body.category ? body.category : null;

    if (!tenantId || !designId || !action) {
      return NextResponse.json(
        { error: "tenant_id, design_id and action are required" },
        { status: 400 }
      );
    }

    const teamId = await resolveTeamId(tenantId);
    if (!teamId) {
      return NextResponse.json(
        { error: "No team found for this tenant" },
        { status: 400 }
      );
    }

    if (action === "unassign") {
      await execute(
        "DELETE FROM team_designs WHERE team_id = ? AND design_id = ?",
        [teamId, designId]
      );
      return NextResponse.json({ ok: true });
    }

    // assign or set-category (upsert)
    await execute(
      `INSERT INTO team_designs (id, tenant_id, team_id, design_id, category, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON CONFLICT (team_id, design_id)
       DO UPDATE SET category = EXCLUDED.category`,
      [uuidv4(), tenantId, teamId, designId, category]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("team-designs POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
