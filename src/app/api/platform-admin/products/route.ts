import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db-async";
import { requirePlatformAdmin } from "@/lib/route-helpers";

export async function GET(request: NextRequest) {
  const authError = requirePlatformAdmin(request);
  if (authError) {
    return NextResponse.json(authError, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenant_id");
    const teamId = searchParams.get("team_id");

    const filters: string[] = ["active = 1"];
    const params: string[] = [];

    if (teamId) {
      filters.push("id IN (SELECT product_type_id FROM team_products WHERE team_id = ?)");
      params.push(teamId);
    } else if (tenantId) {
      filters.push("tenant_id = ?");
      params.push(tenantId);
    }

    const products = await query<any>(
      `SELECT id, name, description, category, example_url, fit_options, active, sort_order, tenant_id
       FROM product_types
       WHERE ${filters.join(" AND ")}
       ORDER BY sort_order ASC, name ASC`,
      params
    );

    return NextResponse.json({
      success: true,
      products: products || []
    });
  } catch (error) {
    console.error("Error fetching products for platform admin:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
