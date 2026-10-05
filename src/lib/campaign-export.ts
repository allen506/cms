/**
 * CSV export for a team's campaign orders.
 *
 * Produces one row per order line, including the member, product, chosen design
 * (code/name), size and gender/fit so CMS admins know exactly what to produce.
 */

import { query } from "./db-async";

export interface CampaignOrderRow {
  order_number: string;
  order_status: string;
  member_email: string | null;
  product_name: string | null;
  design: string | null;
  size: string | null;
  fit: string | null;
  quantity: number;
  price_usd: number;
  price_crc: number;
  created_at: string;
}

/**
 * Fetch order lines for a tenant, optionally scoped to a team and/or campaign.
 * Omitting teamId returns every team's orders (admin-wide export); omitting
 * campaignId returns all of the team's orders.
 */
export async function getCampaignOrderRows(
  tenantId: string,
  teamId?: string,
  campaignId?: string
): Promise<CampaignOrderRow[]> {
  const params: any[] = [tenantId];
  let teamFilter = "";
  if (teamId) {
    teamFilter = "AND o.team_id = ?";
    params.push(teamId);
  }
  let campaignFilter = "";
  if (campaignId) {
    campaignFilter = "AND o.campaign_id = ?";
    params.push(campaignId);
  }

  return query<CampaignOrderRow>(
    `SELECT
        o.order_number                                   AS order_number,
        o.status                                         AS order_status,
        ua.email                                         AS member_email,
        pt.name                                          AS product_name,
        COALESCE(oi.design_name_snapshot, d.name)        AS design,
        COALESCE(oi.size_name_snapshot, s.name)          AS size,
        oi.fit                                           AS fit,
        oi.quantity                                      AS quantity,
        oi.price_usd                                     AS price_usd,
        oi.price_crc                                     AS price_crc,
        o.created_at                                     AS created_at
      FROM orders o
      JOIN order_items oi        ON oi.order_id = o.id
      LEFT JOIN product_types pt ON pt.id = oi.product_type_id
      LEFT JOIN designs d        ON d.id = oi.design_id
      LEFT JOIN sizes s          ON s.id = oi.size_id
      LEFT JOIN user_accounts ua ON ua.id = o.user_id
     WHERE o.tenant_id = ? ${teamFilter} ${campaignFilter}
     ORDER BY ua.email, o.created_at, pt.name`,
    params
  );
}

/** Escape a single CSV field per RFC 4180. */
function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function rowsToCsv(rows: CampaignOrderRow[]): string {
  const headers = [
    "Order #",
    "Status",
    "Member Email",
    "Product",
    "Design",
    "Size",
    "Gender/Fit",
    "Quantity",
    "Unit Price USD",
    "Unit Price CRC",
    "Ordered At",
  ];

  const lines = [headers.map(csvField).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.order_number,
        r.order_status,
        r.member_email,
        r.product_name,
        r.design,
        r.size,
        r.fit,
        r.quantity,
        r.price_usd,
        r.price_crc,
        r.created_at,
      ]
        .map(csvField)
        .join(",")
    );
  }
  // Prepend UTF-8 BOM so Excel renders accents (CRC names, Spanish) correctly.
  return "\uFEFF" + lines.join("\r\n");
}

export async function buildCampaignCsv(
  tenantId: string,
  teamId?: string,
  campaignId?: string
): Promise<string> {
  const rows = await getCampaignOrderRows(tenantId, teamId, campaignId);
  return rowsToCsv(rows);
}
