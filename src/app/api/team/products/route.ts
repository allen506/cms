import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db-async";
import { extractContext } from "@/lib/route-helpers";
import { getExchangeRate, crcToUsd } from "@/lib/exchange-rate";
import { getUnlockedCategories } from "@/lib/unlock";
import { getProductAddons } from "@/lib/pricing-resolver";

export async function GET(request: NextRequest) {
  try {
    const ctx = extractContext(request);
    const teamId = request.headers.get("x-team-id");

    if (!teamId) {
      return NextResponse.json({ error: "Team ID required in headers" }, { status: 400 });
    }

    const tenant = await queryOne<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = ?",
      [ctx.tenantSlug]
    );

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const [{ rate, source, fecha, isFallback }, unlocked] = await Promise.all([
      getExchangeRate(),
      getUnlockedCategories(teamId),
    ]);

    // Standard global catalog (all active products)
    const products = await query<any>(
      `SELECT id, name, description, category, example_url, sort_order, unlock_category, fit_options
         FROM product_types
        WHERE active = 1
        ORDER BY sort_order ASC`,
      []
    );

    const productsWithPricing = await Promise.all(
      products.map(async (product: any) => {
        // Standard tiers (global or tenant-specific)
        const tiers = await query<any>(
          `SELECT min_qty, max_qty, price_crc
             FROM pricing_tiers
            WHERE product_type_id = $1
              AND (tenant_id = $2 OR tenant_id IS NULL)
            ORDER BY min_qty ASC`,
          [product.id, tenant.id]
        );

        // Active per-customer adjustment for this team+product
        const adj = await queryOne<any>(
          `SELECT adjustment_type, discount_percent, price_crc, label
             FROM price_overrides
            WHERE product_type_id = $1 AND team_id = $2
              AND (tenant_id = $3 OR tenant_id IS NULL)
              AND (expires_at IS NULL OR expires_at > NOW())
              AND (active_from IS NULL OR active_from <= NOW())
              AND (active_until IS NULL OR active_until > NOW())
            ORDER BY created_at DESC
            LIMIT 1`,
          [product.id, teamId, tenant.id]
        );

        const applyAdjustment = (originalCrc: number): number => {
          if (!adj) return originalCrc;
          if (adj.adjustment_type === "percent" && adj.discount_percent != null) {
            return Math.round(originalCrc * (1 - Number(adj.discount_percent) / 100));
          }
          if (adj.price_crc != null) return Number(adj.price_crc);
          return originalCrc;
        };

        const pricing = tiers.map((t: any) => {
          const originalCrc = Number(t.price_crc);
          const finalCrc = applyAdjustment(originalCrc);
          return {
            min_qty: t.min_qty,
            max_qty: t.max_qty,
            price_crc: finalCrc,
            price_usd: crcToUsd(finalCrc, rate),
            original_crc: originalCrc,
            original_usd: crcToUsd(originalCrc, rate),
          };
        });

        const adjustment = adj
          ? {
              type: adj.adjustment_type === "percent" ? "percent" : "fixed",
              value:
                adj.adjustment_type === "percent"
                  ? Number(adj.discount_percent)
                  : Number(adj.price_crc),
              label: adj.label ?? null,
            }
          : null;

        const rawAddons = await getProductAddons(product.id, tenant.id, rate);
        const addons = rawAddons.map((a) => ({
          id: a.id,
          name: a.name_en,
          name_en: a.name_en,
          name_es: a.name_es,
          price_crc: a.price_crc,
          price_usd: a.price_usd,
        }));

        const locked = product.unlock_category
          ? !unlocked.has(product.unlock_category)
          : unlocked.size === 0;

        return {
          ...product,
          locked,
          hasOverride: adjustment !== null,
          adjustment,
          pricing,
          addons,
        };
      })
    );

    return NextResponse.json({
      success: true,
      products: productsWithPricing,
      count: productsWithPricing.length,
      exchangeRateInfo: { rate, source, fecha, isFallback: isFallback || false },
    });
  } catch (error) {
    console.error("Error fetching team products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
