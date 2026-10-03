import { NextRequest, NextResponse } from "next/server";
import { execute, query, queryOne } from "@/lib/db-async";
import { requirePlatformAdmin } from "@/lib/route-helpers";
import { getExchangeRate, crcToUsd } from "@/lib/exchange-rate";
import { getUnitPriceCRC } from "@/lib/pricing";

/** Get all orders across all tenants with filtering */
export async function GET(request: NextRequest) {
  try {
    const authError = requirePlatformAdmin(request);
    if (authError) {
      return NextResponse.json(authError, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenant_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let whereClause = '1=1';
    let paramIndex = 1;
    const params: any[] = [];

    if (tenantId) {
      whereClause += ` AND o.tenant_id = $${paramIndex}`;
      params.push(tenantId);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND o.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    params.push(limit, offset);

    const orders = await query<any>(
      `SELECT o.id, o.tenant_id, o.user_name, o.user_email, o.order_number, o.status, o.created_at,
              t.name as tenant_name, t.slug as tenant_slug,
              COUNT(oi.id) as item_count
       FROM orders o
       LEFT JOIN tenants t ON o.tenant_id = t.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE ${whereClause}
       GROUP BY o.id, o.tenant_id, o.user_name, o.user_email, o.order_number, o.status, o.created_at, t.id, t.name, t.slug
       ORDER BY o.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    const countParams = params.slice(0, params.length - 2);
    const total = await queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT o.id) as count FROM orders o
       LEFT JOIN tenants t ON o.tenant_id = t.id
       WHERE ${whereClause}`,
      countParams
    );

    return NextResponse.json({
      orders,
      total: total?.count || 0,
      limit,
      offset});
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/** Create order on behalf of a tenant */
export async function POST(request: NextRequest) {
  try {
    const authError = requirePlatformAdmin(request);
    if (authError) {
      return NextResponse.json(authError, { status: 401 });
    }

    const body = await request.json();
    const { tenantId, userName, userEmail, items } = body;

    if (!tenantId || !userName) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, userName' },
        { status: 400 }
      );
    }

    // Verify tenant exists
    const tenant = await queryOne<any>(
      'SELECT id FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}`;
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create order
    await execute(
      `INSERT INTO orders (id, tenant_id, user_name, user_email, order_number, status, total_crc, total_usd, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [orderId, tenantId, userName, userEmail, orderNumber, 'draft', 0, 0, new Date().toISOString()]
    );

    // Add items if provided
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await execute(
          `INSERT INTO order_items (id, order_id, product_type_id, design_id, size_id, quantity, sleeve_length, fit, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [itemId, orderId, item.productTypeId, item.designId, item.sizeId, item.quantity, item.sleeveLength, item.fit, new Date().toISOString()]
        );
      }
    }

    return NextResponse.json({
      success: true,
      orderId,
      orderNumber});
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'Failed to create order', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
