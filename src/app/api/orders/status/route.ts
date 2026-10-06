import { NextRequest, NextResponse } from "next/server";
import { execute, queryOne } from "@/lib/db-async";
import { getDb } from "@/lib/db";
import { requireAdminSession } from "@/lib/route-helpers";

export async function GET() {
  try {
    const usePostgres = Boolean(process.env.DATABASE_URL) && process.env.DB_TYPE !== "sqlite";
    let result: { value: string } | null | undefined = null;

    if (usePostgres) {
      try {
        result = await queryOne<{ value: string }>(
          `SELECT value FROM app_settings WHERE key = $1`,
          ["ordering_active"]
        );
      } catch (error) {
        console.warn("PostgreSQL ordering status query failed, falling back to SQLite:", error);
        result = getDb()
          .prepare(`SELECT value FROM app_settings WHERE key = ?`)
          .get("ordering_active") as { value: string } | undefined | null;
      }
    } else {
      result = getDb()
        .prepare(`SELECT value FROM app_settings WHERE key = ?`)
        .get("ordering_active") as { value: string } | undefined | null;
    }

    const orderingActive = result ? result.value === "1" : true;
    return NextResponse.json({ orderingActive });
  } catch (error) {
    console.error("Error fetching ordering status:", error);
    return NextResponse.json({ error: "Failed to fetch ordering status" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) return NextResponse.json({ error: authError.error }, { status: 401 });

  try {
    const body = await request.json();
    const { orderingActive } = body;

    if (typeof orderingActive !== "boolean") {
      return NextResponse.json({ error: "orderingActive must be a boolean" }, { status: 400 });
    }

    const usePostgres = Boolean(process.env.DATABASE_URL) && process.env.DB_TYPE !== "sqlite";

    if (usePostgres) {
      try {
        await execute(
          `UPDATE app_settings SET value = ?, updated_at = NOW() WHERE key = ?`,
          [orderingActive ? "1" : "0", "ordering_active"]
        );
      } catch (error) {
        console.warn("PostgreSQL ordering status update failed, falling back to SQLite:", error);
        getDb().prepare(`INSERT INTO app_settings (key, value, updated_at)
          VALUES (?, ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`).run("ordering_active", orderingActive ? "1" : "0");
      }
    } else {
      getDb().prepare(`INSERT INTO app_settings (key, value, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`).run("ordering_active", orderingActive ? "1" : "0");
    }

    return NextResponse.json({ orderingActive, success: true });
  } catch (error) {
    console.error("Error updating ordering status:", error);
    return NextResponse.json({ error: "Failed to update ordering status" }, { status: 500 });
  }
}
