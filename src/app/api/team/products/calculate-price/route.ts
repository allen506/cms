import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db-async";
import { extractContext } from "@/lib/route-helpers";
import { resolvePrice, getProductAddons } from "@/lib/pricing-resolver";

export async function POST(request: NextRequest) {
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

    const { productId, quantity, addonIds } = await request.json();

    if (!productId || !quantity || quantity < 1) {
      return NextResponse.json({ error: "Product ID and quantity (>= 1) required" }, { status: 400 });
    }

    const resolved = await resolvePrice({
      productId,
      quantity,
      teamId,
      tenantId: tenant.id,
    });

    if (resolved.quoteOnly) {
      return NextResponse.json({
        success: true,
        productId,
        quantity,
        quoteOnly: true,
        message: "Quantities above the listed tiers are quoted separately.",
      });
    }

    const addons = await getProductAddons(productId, tenant.id, resolved.rate);

    // Add per-unit add-on cost for any selected add-ons
    const selectedIds: string[] = Array.isArray(addonIds) ? addonIds : [];
    const selectedAddons = addons.filter((a) => selectedIds.includes(a.id));
    const addonCrc = selectedAddons.reduce((s, a) => s + Number(a.price_crc), 0);
    const addonUsd = selectedAddons.reduce((s, a) => s + Number(a.price_usd), 0);

    const unitCrc = resolved.finalCrc + addonCrc;
    const unitUsd = resolved.finalUsd + addonUsd;

    return NextResponse.json({
      success: true,
      productId,
      quantity,
      // Backward-compatible fields reflect the FINAL (adjusted) unit price incl. add-ons
      priceCrc: unitCrc,
      priceUsd: unitUsd,
      isOverride: resolved.adjustment !== null,
      totalCrc: unitCrc * quantity,
      totalUsd: unitUsd * quantity,
      // Enriched pricing detail for strikethrough + reason display
      originalCrc: resolved.originalCrc,
      originalUsd: resolved.originalUsd,
      finalCrc: resolved.finalCrc,
      finalUsd: resolved.finalUsd,
      adjustment: resolved.adjustment,
      rate: resolved.rate,
      addons,
      selectedAddons,
    });
  } catch (error) {
    console.error("Error calculating price:", error);
    return NextResponse.json({ error: "Failed to calculate price" }, { status: 500 });
  }
}
