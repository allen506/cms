import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { queryOne, execute } from "@/lib/db-async";

// GET /api/user/profile?pin=1234
export async function GET(request: NextRequest) {
  const pin = request.nextUrl.searchParams.get("pin");
  if (!pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 400 });
  }

  try {
    const usePostgres = Boolean(process.env.DATABASE_URL) && process.env.DB_TYPE !== "sqlite";
    let profile: { pin: string; full_name: string } | null = null;

    if (usePostgres) {
      try {
        profile = await queryOne<{ pin: string; full_name: string }>(
          "SELECT pin, full_name FROM user_profiles WHERE pin = $1",
          [pin]
        );
      } catch (error) {
        console.warn("PostgreSQL PIN lookup failed, falling back to SQLite:", error);
        const row = getDb()
          .prepare("SELECT pin, full_name FROM user_profiles WHERE pin = ?")
          .get(pin) as { pin: string; full_name: string } | undefined;
        profile = row ? { pin: row.pin, full_name: row.full_name } : null;
      }
    } else {
      const row = getDb()
        .prepare("SELECT pin, full_name FROM user_profiles WHERE pin = ?")
        .get(pin) as { pin: string; full_name: string } | undefined;
      profile = row ? { pin: row.pin, full_name: row.full_name } : null;
    }

    if (!profile) {
      return NextResponse.json({ error: "PIN not found" }, { status: 404 });
    }

    return NextResponse.json({ pin: profile.pin, fullName: profile.full_name });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// POST /api/user/profile — create a new profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin, fullName } = body;

    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
    }
    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }

    const usePostgres = Boolean(process.env.DATABASE_URL) && process.env.DB_TYPE !== "sqlite";

    if (usePostgres) {
      try {
        const existing = await queryOne<{ pin: string }>(
          "SELECT pin FROM user_profiles WHERE pin = $1",
          [pin]
        );
        if (existing) {
          return NextResponse.json({ error: "PIN already taken — choose a different one" }, { status: 409 });
        }

        await execute(
          "INSERT INTO user_profiles (pin, full_name, created_at) VALUES ($1, $2, NOW())",
          [pin, fullName.trim()]
        );
      } catch (error) {
        console.warn("PostgreSQL user profile creation failed, falling back to SQLite:", error);
        const existing = getDb()
          .prepare("SELECT pin FROM user_profiles WHERE pin = ?")
          .get(pin) as { pin: string } | undefined;
        if (existing) {
          return NextResponse.json({ error: "PIN already taken — choose a different one" }, { status: 409 });
        }

        getDb().prepare(
          "INSERT INTO user_profiles (pin, full_name, created_at) VALUES (?, ?, datetime('now'))"
        ).run(pin, fullName.trim());
      }
    } else {
      const existing = getDb()
        .prepare("SELECT pin FROM user_profiles WHERE pin = ?")
        .get(pin) as { pin: string } | undefined;
      if (existing) {
        return NextResponse.json({ error: "PIN already taken — choose a different one" }, { status: 409 });
      }

      getDb().prepare(
        "INSERT INTO user_profiles (pin, full_name, created_at) VALUES (?, ?, datetime('now'))"
      ).run(pin, fullName.trim());
    }

    return NextResponse.json({ pin, fullName: fullName.trim() }, { status: 201 });
  } catch (error) {
    console.error("Error creating profile:", error);
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }
}
