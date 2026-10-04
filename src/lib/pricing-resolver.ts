import { query, queryOne } from "@/lib/db-async";
import { getExchangeRate, crcToUsd } from "@/lib/exchange-rate";

export interface PriceAdjustment {
  type: "fixed" | "percent";
  value: number; // fixed price in CRC, or percent discount (e.g., 10 = 10%)
  label: string | null;
}

export interface ResolvedPrice {
  productId: string;
  quantity: number;
  /** Standard tier unit price before any customer adjustment. */
  originalCrc: number;
  originalUsd: number;
  /** Final unit price after applying any customer adjustment. */
  finalCrc: number;
  finalUsd: number;
  /** The applied adjustment, if any. */
  adjustment: PriceAdjustment | null;
  /** Exchange rate used (BCCR sell). */
  rate: number;
  /** True when no tier matched (e.g., 100+ quoted separately). */
  quoteOnly: boolean;
}

/**
 * Resolve the standard tier price for a product at a given quantity, then apply
 * any active per-customer (team) adjustment. Standard tiers are global
 * (tenant_id IS NULL); tenant-specific tiers take precedence if present.
 */
export async function resolvePrice(opts: {
  productId: string;
  quantity: number;
  teamId?: string | null;
  tenantId?: string | null;
  rate?: number;
}): Promise<ResolvedPrice> {
  const { productId, quantity, teamId, tenantId } = opts;
  const rate = opts.rate ?? (await getExchangeRate()).rate;

  // Base tier: prefer tenant-specific tier, fall back to global (NULL) tier.
  const tier = await queryOne<{ price_crc: number }>(
    `SELECT price_crc
       FROM pricing_tiers
      WHERE product_type_id = $1
        AND min_qty <= $2 AND (max_qty IS NULL OR max_qty >= $2)
        AND (tenant_id = $3 OR tenant_id IS NULL)
      ORDER BY (tenant_id IS NOT NULL) DESC, min_qty DESC
      LIMIT 1`,
    [productId, quantity, tenantId ?? null]
  );

  if (!tier) {
    return {
      productId,
      quantity,
      originalCrc: 0,
      originalUsd: 0,
      finalCrc: 0,
      finalUsd: 0,
      adjustment: null,
      rate,
      quoteOnly: true,
    };
  }

  const originalCrc = Number(tier.price_crc);
  let finalCrc = originalCrc;
  let adjustment: PriceAdjustment | null = null;

  // Active per-customer adjustment for this team+product.
  if (teamId) {
    const adj = await queryOne<{
      adjustment_type: string | null;
      discount_percent: number | null;
      price_crc: number | null;
      label: string | null;
    }>(
      `SELECT adjustment_type, discount_percent, price_crc, label
         FROM price_overrides
        WHERE product_type_id = $1 AND team_id = $2
          AND ($3::text IS NULL OR tenant_id = $3 OR tenant_id IS NULL)
          AND (expires_at IS NULL OR expires_at > NOW())
          AND (active_from IS NULL OR active_from <= NOW())
          AND (active_until IS NULL OR active_until > NOW())
        ORDER BY created_at DESC
        LIMIT 1`,
      [productId, teamId, tenantId ?? null]
    );

    if (adj) {
      if (adj.adjustment_type === "percent" && adj.discount_percent != null) {
        const pct = Number(adj.discount_percent);
        finalCrc = Math.round(originalCrc * (1 - pct / 100));
        adjustment = { type: "percent", value: pct, label: adj.label };
      } else if (adj.price_crc != null) {
        finalCrc = Number(adj.price_crc);
        adjustment = {
          type: "fixed",
          value: finalCrc,
          label: adj.label,
        };
      }
    }
  }

  return {
    productId,
    quantity,
    originalCrc,
    originalUsd: crcToUsd(originalCrc, rate),
    finalCrc,
    finalUsd: crcToUsd(finalCrc, rate),
    adjustment,
    rate,
    quoteOnly: false,
  };
}

/** Fetch active global/tenant add-ons for a product. */
export async function getProductAddons(
  productId: string,
  tenantId?: string | null,
  rate?: number
): Promise<
  Array<{
    id: string;
    name_en: string;
    name_es: string;
    price_crc: number;
    price_usd: number;
  }>
> {
  const r = rate ?? (await getExchangeRate()).rate;
  const rows = await query<{
    id: string;
    name_en: string;
    name_es: string;
    price_crc: number;
  }>(
    `SELECT id, name_en, name_es, price_crc
       FROM product_addons
      WHERE product_type_id = $1
        AND active = 1
        AND (tenant_id = $2 OR tenant_id IS NULL)
      ORDER BY sort_order`,
    [productId, tenantId ?? null]
  );
  return rows.map((a) => ({
    ...a,
    price_crc: Number(a.price_crc),
    price_usd: crcToUsd(Number(a.price_crc), r),
  }));
}
