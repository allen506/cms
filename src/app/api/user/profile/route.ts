import { NextRequest, NextResponse } from "next/server";
import {
  queryOne, execute} from "@/lib/db-async";
import { v4 as uuidv4 } from "uuid";

// GET /api/user/profile?pin=1234
export async function GET(request: NextRequest) {
  const pin = request.nextUrl.searchParams.get("pin");
  if (!pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 400 });
  }

  try {
    const profile = await queryOne<{ pin: string; full_name: string }>(
      "SELECT pin, full_name FROM user_profiles WHERE pin = ?",
      [pin]
    );

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

    const existing = await queryOne<{ pin: string }>(
      "SELECT pin FROM user_profiles WHERE pin = ?",
      [pin]
    );
    if (existing) {
      return NextResponse.json({ error: "PIN already taken — choose a different one" }, { status: 409 });
    }

    await execute(
      "INSERT INTO user_profiles (id, pin, full_name, created_at) VALUES (?, ?, ?, NOW())",
      [uuidv4(), pin, fullName.trim()]
    );

    return NextResponse.json({ pin, fullName: fullName.trim() }, { status: 201 });
  } catch (error) {
    console.error("Error creating profile:", error);
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }
}
