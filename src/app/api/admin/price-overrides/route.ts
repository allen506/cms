import { NextRequest, NextResponse } from "next/server";
import { execute, query, queryOne } from "@/lib/db-async";
import { requireAdminSession, extractContext } from "@/lib/route-helpers";
import { v4 as uuidv4 } from "uuid";

async function resolveTenantId(request: NextRequest): Promise<string | null> {
  const ctx = extractContext(request);
  const tenant = await queryOne<{ id: string }>(
    "SELECT id FROM tenants WHERE slug = ?",
    [ctx.tenantSlug]
  );
  if (tenant) return tenant.id;
  const fallback = await queryOne<{ id: string }>(
    "SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1",
    []
  );
  return fallback?.id ?? null;
}

export async function GET(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: 401 });
  }

  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const teams = await query<any>(
      "SELECT id, name FROM teams WHERE tenant_id = ? ORDER BY name",
      [tenantId]
    );

    const products = await query<any>(
      "SELECT id, name, category FROM product_types WHERE active = 1 ORDER BY sort_order",
      []
    );

    const overrides = await query<any>(
      `SELECT po.id, po.team_id, po.product_type_id, po.adjustment_type,
              po.discount_percent, po.price_crc, po.label, po.active_until, po.expires_at,
              t.name AS team_name, pt.name AS product_name
         FROM price_overrides po
         LEFT JOIN teams t ON t.id = po.team_id
         LEFT JOIN product_types pt ON pt.id = po.product_type_id
        WHERE (po.tenant_id = $1 OR po.tenant_id IS NULL)
        ORDER BY po.created_at DESC`,
      [tenantId]
    );

    return NextResponse.json({ teams, products, overrides });
  } catch (error) {
    console.error("Error fetching price overrides:", error);
    return NextResponse.json({ error: "Failed to fetch price overrides" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: 401 });
  }

  try {
    const tenantId = await resolveTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      team_id,
      product_type_id,
      adjustment_type,
      discount_percent,
      price_crc,
      label,
      active_until,
    } = body;

    if (!team_id || !product_type_id || !adjustment_type) {
      return NextResponse.json(
        { error: "team_id, product_type_id and adjustment_type are required" },
        { status: 400 }
      );
    }

    if (adjustment_type === "percent") {
      if (discount_percent == null || discount_percent <= 0 || discount_percent >= 100) {
        return NextResponse.json(
          { error: "discount_percent must be between 0 and 100" },
          { status: 400 }
        );
      }
    } else if (adjustment_type === "fixed") {
      if (price_crc == null || price_crc <= 0) {
        return NextResponse.json(
          { error: "price_crc must be greater than 0 for a fixed override" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "adjustment_type must be 'percent' or 'fixed'" },
        { status: 400 }
      );
    }

    // One active adjustment per team+product: replace existing.
    await execute(
      `DELETE FROM price_overrides
        WHERE team_id = ? AND product_type_id = ? AND (tenant_id = ? OR tenant_id IS NULL)`,
      [team_id, product_type_id, tenantId]
    );

    const id = uuidv4();
    await execute(
      `INSERT INTO price_overrides
         (id, tenant_id, team_id, product_type_id, adjustment_type,
          discount_percent, price_crc, label, active_until, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        tenantId,
        team_id,
        product_type_id,
        adjustment_type,
        adjustment_type === "percent" ? discount_percent : null,
        adjustment_type === "fixed" ? price_crc : null,
        label || null,
        active_until || null,
      ]
    );

    return NextResponse.json({ id, message: "Price adjustment saved" }, { status: 201 });
  } catch (error) {
    console.error("Error saving price override:", error);
    return NextResponse.json({ error: "Failed to save price override" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await execute("DELETE FROM price_overrides WHERE id = ?", [id]);
    return NextResponse.json({ message: "Price adjustment removed" });
  } catch (error) {
    console.error("Error deleting price override:", error);
    return NextResponse.json({ error: "Failed to delete price override" }, { status: 500 });
  }
}
