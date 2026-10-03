import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db-async";

// PATCH - update an order item's fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const body = await request.json();

    const item = await queryOne<any>(
      "SELECT * FROM order_items WHERE id = ?",
      [itemId]
    );

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (body.productTypeId) {
      updates.push("product_type_id = ?");
      values.push(body.productTypeId);
    }
    if (body.designId) {
      updates.push("design_id = ?");
      values.push(body.designId);
    }
    if (body.sizeId) {
      updates.push("size_id = ?");
      values.push(body.sizeId);
    }
    if (body.quantity && body.quantity > 0) {
      updates.push("quantity = ?");
      values.push(body.quantity);
    }
    if ("sleeveLength" in body) {
      updates.push("sleeve_length = ?");
      values.push(body.sleeveLength || null);
    }
    if ("fit" in body) {
      updates.push("fit = ?");
      values.push(body.fit || null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push("updated_at = NOW()");
    values.push(itemId);

    await execute(`UPDATE order_items SET ${updates.join(", ")} WHERE id = ?`, values);
    return NextResponse.json({ message: "Item updated" });
  } catch (error) {
    console.error("Error updating order item:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

// DELETE a single order item by its ID
// If it was the last item in the order, delete the order too
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;

    // Find the item and its parent order
    const item = await queryOne<{ id: string; order_id: string }>(
      "SELECT id, order_id FROM order_items WHERE id = ?",
      [itemId]
    );

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const orderId = item.order_id;

    // Delete the item
    await execute("DELETE FROM order_items WHERE id = ?", [itemId]);

    // Check if there are remaining items in the order
    const remaining = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM order_items WHERE order_id = ?",
      [orderId]
    );

    // If no items left, delete the order too
    if (!remaining || remaining.count === 0) {
      await execute("DELETE FROM orders WHERE id = ?", [orderId]);
    }

    return NextResponse.json({ message: "Item deleted" });
  } catch (error) {
    console.error("Error deleting order item:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}

// GET a single order item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const item = await queryOne<any>(
      "SELECT * FROM order_items WHERE id = ?",
      [itemId]
    );

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Error fetching order item:", error);
    return NextResponse.json({ error: "Failed to fetch item" }, { status: 500 });
  }
}
