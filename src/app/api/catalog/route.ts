import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db-async";
import { getExchangeRate, crcToUsd } from "@/lib/exchange-rate";

function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

async function resolveCatalogScope(request: Request, explicitTenantId: string | null, explicitTeamId: string | null) {
  let tenantId = explicitTenantId;
  let teamId = explicitTeamId || request.headers.get("x-team-id");

  const tenantSlug = request.headers.get("x-tenant-slug");
  if (!tenantId && tenantSlug) {
    const tenant = await queryOne<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = ?",
      [tenantSlug.toLowerCase()]
    );
    tenantId = tenant?.id ?? null;
  }

  if (!tenantId) {
    const userId = getCookieValue(request.headers.get("cookie"), "tenant_user_id");
    if (userId) {
      const user = await queryOne<{ tenant_id: string; team_id: string | null }>(
        "SELECT tenant_id, team_id FROM user_accounts WHERE id = ?",
        [userId]
      );
      tenantId = user?.tenant_id ?? null;
      teamId = teamId ?? user?.team_id ?? null;
    }
  }

  return { tenantId, teamId };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenant_id");
    const teamId = searchParams.get("team_id");
    const scope = await resolveCatalogScope(request, tenantId, teamId);
    const effectiveTenantId = scope.tenantId;
    const effectiveTeamId = scope.teamId;

    let designSql = "SELECT * FROM designs WHERE active = 1";
    const designParams: any[] = [];
    if (effectiveTenantId) {
      designSql += " AND tenant_id = ?";
      designParams.push(effectiveTenantId);
    }
    if (effectiveTeamId) {
      designSql += " AND team_id = ?";
      designParams.push(effectiveTeamId);
    }
    designSql += " ORDER BY sort_order";

    let productDesignSql = "SELECT product_type_id, design_id FROM product_designs WHERE active = 1";
    const productDesignParams: any[] = [];
    if (effectiveTenantId) {
      productDesignSql += " AND tenant_id = ?";
      productDesignParams.push(effectiveTenantId);
    }
    if (effectiveTeamId) {
      productDesignSql += " AND team_id = ?";
      productDesignParams.push(effectiveTeamId);
    }

    let productTypesSql = "SELECT id, name, description, category, example_url, fit_options, active, sort_order, tenant_id FROM product_types WHERE active = 1";
    const productTypeParams: any[] = [];
    if (effectiveTenantId) {
      productTypesSql += " AND tenant_id = ?";
      productTypeParams.push(effectiveTenantId);
    }
    if (effectiveTeamId) {
      productTypesSql += " AND id IN (SELECT product_type_id FROM team_products WHERE tenant_id = ? AND team_id = ?)";
      productTypeParams.push(effectiveTenantId ?? "", effectiveTeamId);
    }
    productTypesSql += " ORDER BY sort_order";

    let pricingTierSql = "SELECT * FROM pricing_tiers WHERE 1 = 1";
    const pricingTierParams: any[] = [];
    if (effectiveTenantId) {
      pricingTierSql += " AND (tenant_id = ? OR tenant_id IS NULL)";
      pricingTierParams.push(effectiveTenantId);
    }
    pricingTierSql += " ORDER BY product_type_id, min_qty";

    const [designs, productTypes, sizes, pricingTiers, productDesigns] =
      await Promise.all([
        query<any>(designSql, designParams),
        query<any>(productTypesSql, productTypeParams),
        query<any>("SELECT * FROM sizes ORDER BY sort_order", []),
        query<any>(pricingTierSql, pricingTierParams),
        query<any>(productDesignSql, productDesignParams),
      ]);

    // Get current exchange rate (BCCR sell rate) and calculate USD in real-time
    const exchangeRate = await getExchangeRate();
    const rate = exchangeRate.rate;

    const pricingTiersWithLiveUSD = pricingTiers.map((tier: any) => ({
      ...tier,
      price_crc: Number(tier.price_crc),
      price_usd: Number(tier.price_usd ?? crcToUsd(Number(tier.price_crc), rate)),
    }));

    return NextResponse.json({
      designs,
      productTypes,
      sizes,
      pricingTiers: pricingTiersWithLiveUSD,
      productDesigns,
      exchangeRate: rate,
      exchangeRateInfo: {
        rate,
        source: exchangeRate.source,
        fecha: exchangeRate.fecha,
        isFallback: exchangeRate.isFallback || false,
      }});
  } catch (error) {
    console.error("Error fetching catalog:", error);
    return NextResponse.json(
      { error: "Failed to fetch catalog data" },
      { status: 500 }
    );
  }
}
