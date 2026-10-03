import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db-async";
import { createSessionToken, verifyPassword } from "@/lib/auth-utils";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Get designer account
    const results = await query(
      "SELECT id, email, password_hash, full_name FROM designer_accounts WHERE email = $1",
      [email]
    );

    if (results.length === 0) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const designer = results[0];

    // Verify password
    if (!verifyPassword(password, designer.password_hash)) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Create session token
    const token = createSessionToken();
    const response = NextResponse.json({
      success: true,
      designer: {
        id: designer.id,
        email: designer.email,
        name: designer.full_name}});

    // Set session cookies
    response.cookies.set("designer_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/"});

    response.cookies.set("designer_id", designer.id, {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/"});

    return response;
  } catch (error) {
    console.error("Designer login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
