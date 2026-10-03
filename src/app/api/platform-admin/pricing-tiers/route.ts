import { NextRequest, NextResponse } from "next/server";
import { execute, query, queryOne } from "@/lib/db-async";
import { requirePlatformAdmin } from "@/lib/route-helpers";
import { getExchangeRate, crcToUsd } from "@/lib/exchange-rate";

export async function GET(request: NextRequest) {
  const authError = requirePlatformAdmin(request);
  if (authError) {
    return NextResponse.json(authError, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    let sql = `
      SELECT 
        id,
        product_type_id,
        min_qty,
        max_qty,
        price_crc,
        price_usd
      FROM pricing_tiers
      WHERE tenant_id IS NULL
    `;
    const params: any[] = [];

    if (productId) {
      sql += " AND product_type_id = ?";
      params.push(productId);
    }

    sql += " ORDER BY product_type_id, min_qty ASC";

    const tiers = await query<any>(sql, params);

    // Get current exchange rate
    const exchangeRate = await getExchangeRate();
    const rate = exchangeRate.compra;

    // Calculate USD in real-time for each tier
    const tiersWithUSD = tiers.map((tier) => ({
      ...tier,
      price_usd: tier.price_usd || crcToUsd(tier.price_crc, rate)}));

    return NextResponse.json({
      success: true,
      tiers: tiersWithUSD,
      exchangeRate: rate});
  } catch (error) {
    console.error("Error fetching pricing tiers for platform admin:", error);
    return NextResponse.json({ error: "Failed to fetch pricing tiers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = requirePlatformAdmin(request);
  if (authError) {
    return NextResponse.json(authError, { status: 401 });
  }

  try {
    const body = await request.json();
    const { product_type_id, min_qty, max_qty, price_crc, price_usd } = body;

    if (!product_type_id || !min_qty || !max_qty || !price_crc) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const exchangeRate = await getExchangeRate();
    const rate = exchangeRate.compra;
    const calculatedUsd = price_usd || crcToUsd(price_crc, rate);

    const result = await execute(
      `
      INSERT INTO pricing_tiers (product_type_id, min_qty, max_qty, price_crc, price_usd, tenant_id)
      VALUES (?, ?, ?, ?, ?, NULL)
    `,
      [product_type_id, min_qty, max_qty, price_crc, calculatedUsd]
    );

    return NextResponse.json({
      success: true,
      id: result,
      message: "Pricing tier created successfully"});
  } catch (error) {
    console.error("Error creating pricing tier for platform admin:", error);
    return NextResponse.json({ error: "Failed to create pricing tier" }, { status: 500 });
  }
}
