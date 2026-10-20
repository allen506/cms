import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db-async";
import { requirePlatformAdmin } from "@/lib/route-helpers";
import { getExchangeRate, crcToUsd } from "@/lib/exchange-rate";
import { getUnitPriceCRC } from "@/lib/pricing";

/** Get detailed breakdown of orders across all or specific tenant */
export async function GET(request: NextRequest) {
  try {
    const authError = requirePlatformAdmin(request);
    if (authError) {
      return NextResponse.json(authError, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenant_id');

    let tenantWhere = '';
    let tenantWhereSummary = '';
    let paramIndex = 1;
    const params: any[] = [];

    if (tenantId) {
      tenantWhere = ` AND o.tenant_id = $${paramIndex}`;
      tenantWhereSummary = ` AND orders.tenant_id = $${paramIndex}`;
      params.push(tenantId);
      paramIndex++;
    }

    const { compra: exchangeRate } = await getExchangeRate();

    // Note: Currently using orders_old (single-tenant) because orders table is empty
    // TODO: Migrate data to orders table when multi-tenant support is fully implemented
    // Breakdown by product
    const byProduct = await query<any>(
      `SELECT 
        pt.id,
        pt.name,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(oi.quantity), 0) as total_qty
       FROM order_items oi
       JOIN product_types pt ON oi.product_type_id = pt.id
       JOIN orders_old o ON oi.order_id = o.id
       WHERE 1=1
       GROUP BY pt.id, pt.name
       ORDER BY total_qty DESC`,
      []
    );

    // Breakdown by order status
    const byStatus = await query<any>(
      `SELECT 
        o.status,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(oi.quantity), 0) as total_qty
       FROM order_items oi
       JOIN orders_old o ON oi.order_id = o.id
       WHERE 1=1
       GROUP BY o.status
       ORDER BY total_qty DESC`,
      []
    );

    // By user
    const byUser = await query<any>(
      `SELECT 
        o.user_name,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(oi.quantity), 0) as total_qty
       FROM order_items oi
       JOIN orders_old o ON oi.order_id = o.id
       WHERE 1=1
       GROUP BY o.user_name
       ORDER BY total_qty DESC`,
      []
    );


    return NextResponse.json({
      byProduct,
      byStatus,
      byUser,
      exchangeRate,
      summary: {
        totalOrders: await queryOne<{ count: number }>(
          `SELECT COUNT(*) as count FROM orders_old`,
          []
        ),
        totalItems: await queryOne<{ total: number }>(
          `SELECT COALESCE(SUM(quantity), 0) as total FROM order_items oi
           JOIN orders_old o ON oi.order_id = o.id`,
          []
        )}});
  } catch (error) {
    console.error('Get breakdown error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch breakdown', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
