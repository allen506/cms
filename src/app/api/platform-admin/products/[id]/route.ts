import { NextRequest, NextResponse } from "next/server";
import { execute, queryOne } from "@/lib/db-async";
import { requirePlatformAdmin } from "@/lib/route-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requirePlatformAdmin(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: 401 });
  }

  try {
    const { id } = await params;
    const product = await queryOne<any>("SELECT * FROM product_types WHERE id = ?", [id]);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error fetching product for platform admin:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requirePlatformAdmin(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, category, description, example_url, fit_options, active, sort_order } = body;

    const existing = await queryOne("SELECT id FROM product_types WHERE id = ?", [id]);
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const updates = [] as string[];
    const values = [] as any[];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (category !== undefined) {
      updates.push("category = ?");
      values.push(category);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description || null);
    }
    if (example_url !== undefined) {
      updates.push("example_url = ?");
      values.push(example_url || null);
    }
    if (fit_options !== undefined) {
      updates.push("fit_options = ?");
      values.push(fit_options || '["unisex"]');
    }
    if (active !== undefined) {
      updates.push("active = ?");
      values.push(active ? 1 : 0);
    }
    if (sort_order !== undefined) {
      updates.push("sort_order = ?");
      values.push(sort_order);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);
    await execute(`UPDATE product_types SET ${updates.join(", ")} WHERE id = ?`, values);

    return NextResponse.json({ message: "Product updated successfully" });
  } catch (error) {
    console.error("Error updating product for platform admin:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requirePlatformAdmin(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: 401 });
  }

  try {
    const { id } = await params;

    const orders = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM order_items WHERE product_type_id = ?",
      [id]
    );

    if (orders && orders.count > 0) {
      return NextResponse.json(
        { error: `Cannot delete product with ${orders.count} existing orders` },
        { status: 400 }
      );
    }

    await execute("DELETE FROM product_designs WHERE product_type_id = ?", [id]);
    await execute("DELETE FROM pricing_tiers WHERE product_type_id = ?", [id]);
    await execute("DELETE FROM product_types WHERE id = ?", [id]);

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product for platform admin:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
