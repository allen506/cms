import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db-async";

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
    const results = await query(
      "SELECT id, email, full_name FROM designer_accounts WHERE id = $1",
      [designerId]
    );

    if (results.length === 0) {
      return NextResponse.json(
        { error: "Designer not found" },
        { status: 404 }
      );
    }

    const designer = results[0];
    return NextResponse.json({
      success: true,
      designer: {
        id: designer.id,
        email: designer.email,
        name: designer.full_name,
      },
    });
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify" },
      { status: 500 }
    );
  }
}
