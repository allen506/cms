import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdminSession } from "@/lib/route-helpers";

export async function GET(request: NextRequest) {
  try {
    const sessionError = await requireAdminSession(request);

    if (sessionError) {
      return NextResponse.json({ valid: false, error: sessionError.error }, { status: 401 });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Error checking admin session:", error);
    return NextResponse.json({ valid: false, error: "Session invalid" }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get("admin-session")?.value;
    
    if (token) {
      const usePostgres = Boolean(process.env.DATABASE_URL) && process.env.DB_TYPE !== "sqlite";
      if (usePostgres) {
        try {
          const { execute } = await import("@/lib/db-async");
          await execute("DELETE FROM admin_sessions WHERE token = $1", [token]);
        } catch (error) {
          console.warn("PostgreSQL admin logout failed, falling back to SQLite:", error);
          getDb().prepare("DELETE FROM admin_sessions WHERE token = ?").run(token);
        }
      } else {
        getDb().prepare("DELETE FROM admin_sessions WHERE token = ?").run(token);
      }
    }
    
    const response = NextResponse.json({ message: "Logged out" });
    response.cookies.set({
      name: "admin-session",
      value: "",
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error("Error logging out:", error);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}
