import { NextRequest, NextResponse } from "next/server";
import {
  queryOne, execute, verifyPassword, createSessionToken, hashPassword} from "@/lib/route-helpers";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    // Get admin password from environment (required, no fallback)
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error("ADMIN_PASSWORD not configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    // Verify the provided password against the admin password
    if (!(await verifyPassword(password, adminPassword))) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Create admin session token
    const sessionId = uuidv4();
    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    try {
      await execute(
        `INSERT INTO admin_sessions (id, token, expires_at) VALUES ($1, $2, $3)`,
        [sessionId, token, expiresAt.toISOString()]
      );
    } catch (dbError) {
      console.error("Database error during session creation:", dbError);
      throw dbError;
    }

    // Set secure httpOnly cookie for the session
    const response = NextResponse.json({ 
      valid: true,
      token: token  // Also return token for fallback header-based auth
    });
    response.cookies.set({
      name: "admin-session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/"
    });
    return response;
  } catch (error) {
    console.error("Error verifying admin password:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
