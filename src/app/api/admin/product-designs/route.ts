import { NextRequest, NextResponse } from "next/server";
import {
  query, queryOne, execute, requireAdminSession} from "@/lib/db-async";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    const sql = `
      SELECT 
        pd.id,
        pd.product_type_id,
        pd.design_id,
        pd.sort_order,
        pd.active,
        d.name as design_name
      FROM product_designs pd
      LEFT JOIN designs d ON pd.design_id = d.id
    `;

    const associations = productId
      ? await query<any>(
          sql + " WHERE pd.product_type_id = ? ORDER BY pd.sort_order",
          [productId]
        )
      : await query<any>(sql + " ORDER BY pd.product_type_id, pd.sort_order");

    return NextResponse.json({ associations });
  } catch (error) {
    console.error("Error fetching product-design associations:", error);
    return NextResponse.json({ error: "Failed to fetch associations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { product_type_id, design_id, tenant_id, sort_order } = body;

    if (!product_type_id || !design_id) {
      return NextResponse.json({ error: "product_type_id and design_id are required" }, { status: 400 });
    }

    // Check if association already exists
    const existing = await queryOne(
      "SELECT id FROM product_designs WHERE product_type_id = ? AND design_id = ?",
      [product_type_id, design_id]
    );

    if (existing) {
      return NextResponse.json({ error: "Association already exists" }, { status: 409 });
    }

    const id = uuidv4();
    const tenantId = tenant_id || "default-tenant";

    await execute(
      `INSERT INTO product_designs (id, product_type_id, design_id, tenant_id, sort_order, active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, NOW())`,
      [id, product_type_id, design_id, tenantId, sort_order || 0]
    );

    return NextResponse.json({ id, message: "Association created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating product-design association:", error);
    return NextResponse.json({ error: "Failed to create association" }, { status: 500 });
  }
}
