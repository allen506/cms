import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db-async";
import { hashPassword } from "@/lib/auth-utils";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(password);

    const results = await query(
      `UPDATE designer_accounts 
       SET password_hash = $1 
       WHERE email = $2 
       RETURNING id, email`,
      [passwordHash, email]
    );

    if (results.length === 0) {
      return NextResponse.json(
        { error: "Designer account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
      account: results[0]});
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reset password" },
      { status: 500 }
    );
  }
}
