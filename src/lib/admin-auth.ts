import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db-async";

/** Validates the admin session cookie. Returns true if authenticated. */
export async function isAdminAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("admin-session")?.value;
  
  // Debug logging
  const allCookies = request.cookies.getSetCookie ? request.cookies.getSetCookie() : [];
  console.log("📋 Admin auth check - Received cookies:", {
    adminSessionToken: token ? `${token.substring(0, 10)}...` : 'MISSING',
    allCookiesCount: allCookies.length,
    cookieHeader: request.headers.get('cookie'),
  });
  
  if (!token) {
    console.warn("⚠️ No admin-session cookie found");
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
