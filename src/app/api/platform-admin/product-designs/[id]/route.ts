import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db-async";
import { requirePlatformAdmin } from "@/lib/route-helpers";

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
    await execute("DELETE FROM product_designs WHERE id = ?", [id]);

    return NextResponse.json({ message: "Association removed successfully" });
  } catch (error) {
    console.error("Error deleting product-design association for platform admin:", error);
    return NextResponse.json({ error: "Failed to delete association" }, { status: 500 });
  }
}
