import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db-async";
import { getDb } from "@/lib/db";
import { requireAdminSession } from "@/lib/route-helpers";

export async function GET(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) return NextResponse.json({ error: authError.error }, { status: 401 });

  try {
    const usePostgres = Boolean(process.env.DATABASE_URL) && process.env.DB_TYPE !== "sqlite";
    let settings: { key: string; value: string }[] = [];

    if (usePostgres) {
      try {
        settings = await query<{ key: string; value: string }>(`SELECT key, value FROM app_settings`, []);
      } catch (error) {
        console.warn("PostgreSQL app settings query failed, falling back to SQLite:", error);
        settings = getDb().prepare(`SELECT key, value FROM app_settings`).all() as { key: string; value: string }[];
      }
    } else {
      settings = getDb().prepare(`SELECT key, value FROM app_settings`).all() as { key: string; value: string }[];
    }

    const result: Record<string, any> = {};
    settings.forEach(({ key, value }) => {
      if (!isNaN(Number(value))) {
        result[key] = Number(value);
      } else if (value === "0" || value === "1") {
        result[key] = value === "1" ? 1 : 0;
      } else {
        result[key] = value;
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch app settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) return NextResponse.json({ error: authError.error }, { status: 401 });

  try {
    const body = await request.json();
    const usePostgres = Boolean(process.env.DATABASE_URL) && process.env.DB_TYPE !== "sqlite";

    for (const [key, value] of Object.entries(body)) {
      if (usePostgres) {
        try {
          await execute(
            `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, NOW())
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = NOW()`,
            [key, String(value)]
          );
        } catch (error) {
          console.warn("PostgreSQL app settings update failed, falling back to SQLite:", error);
          getDb().prepare(`INSERT INTO app_settings (key, value, updated_at)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`).run(key, String(value));
        }
      } else {
        getDb().prepare(`INSERT INTO app_settings (key, value, updated_at)
          VALUES (?, ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`).run(key, String(value));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update app settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
