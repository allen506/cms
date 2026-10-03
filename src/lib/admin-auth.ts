import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db-async";

/** Validates the admin session cookie. Returns true if authenticated. */
export async function isAdminAuthenticated(request: NextRequest): Promise<boolean> {
  // Try to get token from cookie first
  let token: string | null = request.cookies.get("admin-session")?.value || null;
  
  // Fallback: check for token in X-Admin-Token header
  if (!token) {
    token = request.headers.get("x-admin-token");
  }
  
  // Debug logging
  console.log("📋 Admin auth check", {
    hasCookie: !!request.cookies.get("admin-session")?.value,
    hasHeader: !!request.headers.get("x-admin-token"),
    tokenFound: !!token});
  
  if (!token) {
    console.warn("⚠️ No admin-session cookie or X-Admin-Token header found");
    return false;
  }
  
  try {
    const session = await queryOne(
      "SELECT token FROM admin_sessions WHERE token = $1 AND expires_at > NOW()",
      [token]
    );
    
    if (session) {
      console.log("✅ Admin session valid");
      return true;
    } else {
      console.warn("❌ Admin session not found or expired");
      return false;
    }
  } catch (error) {
    console.error("Error checking admin session:", error);
    return false;
  }
}

/** Standard 401 response for unauthenticated admin requests. */
export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
