import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, requirePlatformAdmin } from "@/lib/route-helpers";
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
    const params: any[] = [];

    if (tenantId) {
      tenantWhere = ' AND o.tenant_id = ?';
      params.push(tenantId);
    }

    const { compra: exchangeRate } = await getExchangeRate();

    // Breakdown by product
    const byProduct = await query<any>(
      `SELECT 
        pt.id,
        pt.name,
        COUNT(DISTINCT o.id) as order_count,
        SUM(oi.quantity) as total_qty,
        GROUP_CONCAT(DISTINCT o.tenant_id) as tenant_ids
       FROM order_items oi
       JOIN product_types pt ON oi.product_type_id = pt.id
       JOIN orders o ON oi.order_id = o.id
       WHERE 1=1 ${tenantWhere}
       GROUP BY pt.id, pt.name
       ORDER BY total_qty DESC`,
      params
    );

    // Breakdown by design
    const byDesign = await query<any>(
      `SELECT 
        d.id,
        d.name,
        COUNT(DISTINCT o.id) as order_count,
        SUM(oi.quantity) as total_qty
       FROM order_items oi
       LEFT JOIN designs d ON oi.design_id = d.id
       JOIN orders o ON oi.order_id = o.id
       WHERE 1=1 ${tenantWhere}
       GROUP BY d.id, d.name
       ORDER BY total_qty DESC`,
      params
    );

    // Breakdown by size
    const bySize = await query<any>(
      `SELECT 
        s.id,
        s.name,
        COUNT(DISTINCT o.id) as order_count,
        SUM(oi.quantity) as total_qty
       FROM order_items oi
       LEFT JOIN sizes s ON oi.size_id = s.id
       JOIN orders o ON oi.order_id = o.id
       WHERE 1=1 ${tenantWhere}
       GROUP BY s.id, s.name
       ORDER BY total_qty DESC`,
      params
    );

    // Breakdown by fit
    const byFit = await query<any>(
      `SELECT 
        COALESCE(oi.fit, 'unspecified') as fit,
        COUNT(DISTINCT o.id) as order_count,
        SUM(oi.quantity) as total_qty
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE 1=1 ${tenantWhere}
       GROUP BY oi.fit
       ORDER BY total_qty DESC`,
      params
    );

    // By team member (user)
    const byUser = await query<any>(
      `SELECT 
        o.user_name,
        o.user_email,
        COUNT(DISTINCT o.id) as order_count,
        SUM(oi.quantity) as total_qty,
        SUM(CASE WHEN o.status = 'completed' THEN oi.quantity ELSE 0 END) as completed_qty
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE 1=1 ${tenantWhere}
       GROUP BY o.user_name, o.user_email
       ORDER BY total_qty DESC`,
      params
    );

    return NextResponse.json({
      byProduct,
      byDesign,
      bySize,
      byFit,
      byUser,
      exchangeRate,
      summary: {
        totalOrders: await queryOne<{ count: number }>(
          `SELECT COUNT(*) as count FROM orders WHERE 1=1 ${tenantWhere}`,
          params
        ),
        totalItems: await queryOne<{ total: number }>(
          `SELECT COALESCE(SUM(quantity), 0) as total FROM order_items oi
           JOIN orders o ON oi.order_id = o.id
           WHERE 1=1 ${tenantWhere}`,
          params
        ),
      },
    });
  } catch (error) {
    console.error('Get breakdown error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch breakdown', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
