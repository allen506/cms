import { NextRequest, NextResponse } from "next/server";
import {
  queryOne, execute, withTransaction } from "@/lib/db-async";

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

    const profile = await queryOne<{ pin: string; full_name: string }>(
      "SELECT pin, full_name FROM user_profiles WHERE LOWER(full_name) = LOWER(?)",
      [name.trim()]
    );

    if (!profile) {
      return NextResponse.json({ error: "No account found with that name" }, { status: 404 });
    }

    // Check PIN isn't already taken by someone else
    const taken = await queryOne<{ pin: string }>(
      "SELECT pin FROM user_profiles WHERE pin = ? AND LOWER(full_name) != LOWER(?)",
      [newPin, name.trim()]
    );
    if (taken) {
      return NextResponse.json({ error: "That PIN is already in use — choose a different one" }, { status: 409 });
    }

    await withTransaction(async () => {
      if (profile.pin !== newPin) {
        // Move profile to new PIN
        await execute(
          "UPDATE user_profiles SET pin = ?, updated_at = NOW() WHERE pin = ?",
          [newPin, profile.pin]
        );
      }
    });

    return NextResponse.json({ pin: newPin, fullName: profile.full_name });
  } catch (error) {
    console.error("Error resetting PIN:", error);
    return NextResponse.json({ error: "Failed to reset PIN" }, { status: 500 });
  }
}
