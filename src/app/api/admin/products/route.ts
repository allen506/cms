import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db-async";
import { requireAdminSession } from "@/lib/route-helpers";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: 401 });
  }

  try {
    const products = await query<any>(
      `SELECT 
        id, 
        name, 
        category, 
        description, 
        example_url,
        sort_order, 
        created_at
      FROM product_types
      ORDER BY sort_order ASC`
    );

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      category,
      description,
      example_url,
      sort_order,
      tenant_id} = body;

    if (!name || !category) {
      return NextResponse.json({ error: "Name and category are required" }, { status: 400 });
    }

    const id = uuidv4();
    const tenantId = tenant_id || "default-tenant";

    await execute(
      `INSERT INTO product_types (id, tenant_id, name, category, description, example_url, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, tenantId, name, category, description || null, example_url || null, sort_order || 999]
    );

    return NextResponse.json({ id, message: "Product created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
