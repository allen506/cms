import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db-async";
import { getUnitPriceCRC } from "@/lib/pricing";
import { getExchangeRate, crcToUsd } from "@/lib/exchange-rate";
import { isAdminAuthenticated, unauthorized } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    console.warn("Unauthorized admin summary request");
    return unauthorized();
  }
  try {
    // Total orders and items
    const stats = await queryOne<{ total_orders: number; total_items: number }>(
      `SELECT 
        (SELECT COUNT(*) FROM orders_old) as total_orders,
        (SELECT COALESCE(SUM(quantity), 0) FROM order_items) as total_items`
    );

    // Get live exchange rate
    const { compra: exchangeRate } = await getExchangeRate();

    // Quantities by product type (only column available in current schema)
    const byProduct = await query<{ product_type_id: string; product_name: string; total_qty: number }>(
      `SELECT 
        oi.product_type_id,
        pt.name as product_name,
        SUM(oi.quantity) as total_qty
       FROM order_items oi
       JOIN product_types pt ON oi.product_type_id = pt.id
       GROUP BY oi.product_type_id, pt.name, pt.sort_order
       ORDER BY pt.sort_order`
    );

    // Calculate pricing based on total quantities and live exchange rate
    const byProductWithPricing = byProduct.map((p) => {
      const priceCRC = getUnitPriceCRC(p.product_type_id, p.total_qty) ?? 0;
      const priceUSD = crcToUsd(priceCRC, exchangeRate);
      return {
        ...p,
        tierPriceCRC: priceCRC,
        tierPriceUSD: priceUSD,
        totalCRC: priceCRC * p.total_qty,
        totalUSD: priceUSD * p.total_qty};
    });

    // Get breakdown by design
    const byDesign = await query<{ design_id: string; design_name: string; total_qty: number }>(
      `SELECT 
        oi.design_id,
        d.name as design_name,
        SUM(oi.quantity) as total_qty
       FROM order_items oi
       JOIN designs d ON oi.design_id = d.id
       GROUP BY oi.design_id, d.name
       ORDER BY d.name`
    );

    // Get breakdown by size
    const bySize = await query<{ size_id: string; size_name: string; total_qty: number }>(
      `SELECT 
        oi.size_id,
        s.name as size_name,
        SUM(oi.quantity) as total_qty
       FROM order_items oi
       JOIN sizes s ON oi.size_id = s.id
       GROUP BY oi.size_id, s.name
       ORDER BY s.name`
    );

    // Get full breakdown by product/design/size
    const fullBreakdown = await query<{
      product_type_id: string;
      product_name: string;
      design_id: string;
      design_name: string;
      size_id: string;
      size_name: string;
      total_qty: number;
    }>(
      `SELECT 
        oi.product_type_id,
        pt.name as product_name,
        oi.design_id,
        d.name as design_name,
        oi.size_id,
        s.name as size_name,
        SUM(oi.quantity) as total_qty
       FROM order_items oi
       JOIN product_types pt ON oi.product_type_id = pt.id
       JOIN designs d ON oi.design_id = d.id
       JOIN sizes s ON oi.size_id = s.id
       GROUP BY oi.product_type_id, pt.name, oi.design_id, d.name, oi.size_id, s.name
       ORDER BY pt.sort_order, d.name, s.name`
    );

    // All orders with items
    const orders = await query<any>(
      `SELECT o.*
       FROM orders_old o 
       ORDER BY o.created_at DESC`
    );

    // Fetch items for each order
    for (const order of orders) {
      order.items = await query<any>(
        `SELECT oi.*, pt.name as product_name, d.name as design_name, s.name as size_name
         FROM order_items oi
         JOIN product_types pt ON oi.product_type_id = pt.id
         JOIN designs d ON oi.design_id = d.id
         JOIN sizes s ON oi.size_id = s.id
         WHERE oi.order_id = ?
         ORDER BY oi.id`,
        [order.id]
      );
    }

    return NextResponse.json({
      summary: {
        totalOrders: stats?.total_orders ?? 0,
        totalItems: stats?.total_items ?? 0,
        byProduct: byProductWithPricing,
        byDesign: byDesign,
        bySize: bySize,
        byFit: [],
        fullBreakdown: fullBreakdown},
      orders: orders,
      exchangeRate});
  } catch (error) {
    console.error("Error fetching admin summary:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch admin summary", details: errorMessage },
      { status: 500 }
    );
  }
}
