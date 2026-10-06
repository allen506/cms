import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

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
    let session: { token?: string } | null = null;

    const usePostgres = Boolean(process.env.DATABASE_URL) && process.env.DB_TYPE !== "sqlite";
    if (usePostgres) {
      try {
        const row = await (await import("@/lib/db-async")).queryOne<any>(
          "SELECT token FROM admin_sessions WHERE token = $1 AND expires_at > NOW()",
          [token]
        );
        session = row ? { token: row.token } : null;
      } catch (error) {
        console.warn("PostgreSQL admin session lookup failed, falling back to SQLite:", error);
        const row = getDb()
          .prepare("SELECT token FROM admin_sessions WHERE token = ? AND datetime(expires_at) > datetime('now')")
          .get(token) as { token?: string } | undefined;
        session = row ? { token: row.token } : null;
      }
    } else {
      const row = getDb()
        .prepare("SELECT token FROM admin_sessions WHERE token = ? AND datetime(expires_at) > datetime('now')")
        .get(token) as { token?: string } | undefined;
      session = row ? { token: row.token } : null;
    }

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
