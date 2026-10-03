import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, requirePlatformAdmin } from "@/lib/db-async";

/** Get per-person order totals for analysis */
export async function GET(request: NextRequest) {
  try {
    const authError = requirePlatformAdmin(request);
    if (authError) {
      return NextResponse.json(authError, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenant_id');

    let tenantWhere = '';
    let paramIndex = 1;
    const params: any[] = [];

    if (tenantId) {
      tenantWhere = ` AND o.tenant_id = $${paramIndex}`;
      params.push(tenantId);
      paramIndex++;
    }

    // Per-person totals
    const personTotals = await query<any>(
      `SELECT 
        o.user_id,
        COUNT(o.id) as order_count,
        COALESCE(SUM(oi.quantity), 0) as total_items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE 1=1 ${tenantWhere}
       GROUP BY o.user_id
       ORDER BY o.user_id`,
      params
    );

    // Statistics
    const stats = await queryOne<any>(
      `SELECT 
        COUNT(DISTINCT o.user_id) as total_people,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(oi.quantity), 0) as total_items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE 1=1 ${tenantWhere}`,
      params
    );

    return NextResponse.json({
      personTotals,
      stats: stats || { total_people: 0, total_orders: 0, total_items: 0 }});
  } catch (error) {
    console.error('Get per-person totals error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch per-person totals', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
