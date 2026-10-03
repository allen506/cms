import { NextRequest, NextResponse } from "next/server";
import {
  query, execute, requireAdminSession} from "@/lib/db-async";

export async function GET(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) return NextResponse.json({ error: authError.error }, { status: 401 });

  try {
    const settings = await query<{ key: string; value: string }>(
      `SELECT key, value FROM app_settings`,
      []
    );

    const result: Record<string, any> = {};
    settings.forEach(({ key, value }) => {
      // Try to parse as number if it looks like one
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

    for (const [key, value] of Object.entries(body)) {
      await execute(
        `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, NOW())
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = NOW()`,
        [key, String(value)]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update app settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
