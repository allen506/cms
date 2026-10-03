import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db-async";

export async function GET(request: NextRequest) {
  try {
    const designerId = request.cookies.get("designer_id")?.value;

    if (!designerId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get designer info
    const designer = await queryOne<any>(
      "SELECT id, email, name FROM designer_accounts WHERE id = ?",
      [designerId]
    );

    if (!designer) {
      return NextResponse.json(
        { error: "Designer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      designer,
    });
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify" },
      { status: 500 }
    );
  }
}
