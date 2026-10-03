import { NextRequest, NextResponse } from "next/server";
import { execute, queryOne } from "@/lib/db-async";
import { requireAdminSession } from "@/lib/route-helpers";

// DELETE admin email
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

    const email = await queryOne<{ email: string }>(
      "SELECT email FROM admin_emails WHERE id = ?",
      [id]
    );

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    await execute("DELETE FROM admin_emails WHERE id = ?", [id]);

    return NextResponse.json({ message: "Email deleted successfully" });
  } catch (error) {
    console.error("Error deleting admin email:", error);
    return NextResponse.json({ error: "Failed to delete email" }, { status: 500 });
  }
}
