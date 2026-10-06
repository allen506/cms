import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { queryOne, execute } from "@/lib/db-async";

// PATCH — reset a user's PIN by providing their full name
export async function PATCH(request: NextRequest) {
  try {
    const { name, newPin } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }
    if (!newPin || !/^\d{4}$/.test(newPin)) {
      return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
    }

    const usePostgres = Boolean(process.env.DATABASE_URL) && process.env.DB_TYPE !== "sqlite";
    let profile: { pin: string; full_name: string } | null = null;

    if (usePostgres) {
      try {
        profile = await queryOne<{ pin: string; full_name: string }>(
          "SELECT pin, full_name FROM user_profiles WHERE LOWER(full_name) = LOWER($1)",
          [name.trim()]
        );
      } catch (error) {
        console.warn("PostgreSQL PIN reset lookup failed, falling back to SQLite:", error);
        const row = getDb()
          .prepare("SELECT pin, full_name FROM user_profiles WHERE LOWER(full_name) = LOWER(?)")
          .get(name.trim()) as { pin: string; full_name: string } | undefined;
        profile = row ? { pin: row.pin, full_name: row.full_name } : null;
      }
    } else {
      const row = getDb()
        .prepare("SELECT pin, full_name FROM user_profiles WHERE LOWER(full_name) = LOWER(?)")
        .get(name.trim()) as { pin: string; full_name: string } | undefined;
      profile = row ? { pin: row.pin, full_name: row.full_name } : null;
    }

    if (!profile) {
      return NextResponse.json({ error: "No account found with that name" }, { status: 404 });
    }

    if (usePostgres) {
      try {
        const taken = await queryOne<{ pin: string }>(
          "SELECT pin FROM user_profiles WHERE pin = $1 AND LOWER(full_name) != LOWER($2)",
          [newPin, name.trim()]
        );
        if (taken) {
          return NextResponse.json({ error: "That PIN is already in use — choose a different one" }, { status: 409 });
        }

        if (profile.pin !== newPin) {
          await execute(
            "UPDATE user_profiles SET pin = $1 WHERE pin = $2",
            [newPin, profile.pin]
          );
        }
      } catch (error) {
        console.warn("PostgreSQL PIN reset update failed, falling back to SQLite:", error);
        const taken = getDb()
          .prepare("SELECT pin FROM user_profiles WHERE pin = ? AND LOWER(full_name) != LOWER(?)")
          .get(newPin, name.trim()) as { pin: string } | undefined;
        if (taken) {
          return NextResponse.json({ error: "That PIN is already in use — choose a different one" }, { status: 409 });
        }

        if (profile.pin !== newPin) {
          getDb().prepare("UPDATE user_profiles SET pin = ? WHERE pin = ?").run(newPin, profile.pin);
        }
      }
    } else {
      const taken = getDb()
        .prepare("SELECT pin FROM user_profiles WHERE pin = ? AND LOWER(full_name) != LOWER(?)")
        .get(newPin, name.trim()) as { pin: string } | undefined;
      if (taken) {
        return NextResponse.json({ error: "That PIN is already in use — choose a different one" }, { status: 409 });
      }

      if (profile.pin !== newPin) {
        getDb().prepare("UPDATE user_profiles SET pin = ? WHERE pin = ?").run(newPin, profile.pin);
      }
    }

    return NextResponse.json({ pin: newPin, fullName: profile.full_name });
  } catch (error) {
    console.error("Error resetting PIN:", error);
    return NextResponse.json({ error: "Failed to reset PIN" }, { status: 500 });
  }
}
