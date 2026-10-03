import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db-async";
import { extractContext } from "@/lib/route-helpers";

export async function GET(request: NextRequest) {
  try {
    const ctx = extractContext(request);
    const teamId = request.headers.get("x-team-id");

    if (!teamId) {
      return NextResponse.json({ error: "Team ID required in headers" }, { status: 400 });
    }

    // Get tenant ID
    const tenant = await queryOne<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = ?",
      [ctx.tenantSlug]
    );

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Get products available for this team
    const products = await query<any>(
      `
      SELECT 
        pt.id,
        pt.name,
        pt.description,
        pt.category,
        pt.example_url,
        pt.sort_order
      FROM team_products tp
      JOIN product_types pt ON pt.id = tp.product_type_id
      WHERE tp.team_id = ? AND tp.tenant_id = ?
      ORDER BY pt.sort_order ASC
    `,
      [teamId, tenant.id]
    );

    // Get pricing for each product
    const productsWithPricing = await Promise.all(
      products.map(async (product: any) => {
        // Check for active price override first
        const override = await queryOne<any>(
          `
          SELECT price_crc, price_usd, expires_at
          FROM price_overrides
          WHERE product_type_id = ? AND team_id = ? AND tenant_id = ?
          AND (expires_at IS NULL OR expires_at > NOW())
          LIMIT 1
        `,
          [product.id, teamId, tenant.id]
        );

        if (override) {
          return {
            ...product,
            hasOverride: true,
            overridePrice: {
              priceCrc: override.price_crc,
              priceUsd: override.price_usd,
              expiresAt: override.expires_at},
            pricing: [], // No tier pricing when override exists
          };
        }

        // Get regular pricing tiers
        const tiers = await query<any>(
          `
          SELECT min_qty, max_qty, price_crc, price_usd
          FROM pricing_tiers
          WHERE product_type_id = ? AND tenant_id = ?
          ORDER BY min_qty ASC
        `,
          [product.id, tenant.id]
        );

        return {
          ...product,
          hasOverride: false,
          pricing: tiers};
      })
    );

    return NextResponse.json({
      success: true,
      products: productsWithPricing,
      count: productsWithPricing.length});
  } catch (error) {
    console.error("Error fetching team products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
