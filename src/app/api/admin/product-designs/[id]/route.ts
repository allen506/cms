import { NextRequest, NextResponse } from "next/server";
import {
  queryOne, execute, requireAdminSession} from "@/lib/db-async";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Check if association exists
    const existing = await queryOne(
      "SELECT id FROM product_designs WHERE id = ?",
      [id]
    );

    if (!existing) {
      return NextResponse.json({ error: "Association not found" }, { status: 404 });
    }

    await execute("DELETE FROM product_designs WHERE id = ?", [id]);

    return NextResponse.json({ message: "Association deleted successfully" });
  } catch (error) {
    console.error("Error deleting product-design association:", error);
    return NextResponse.json({ error: "Failed to delete association" }, { status: 500 });
  }
}
