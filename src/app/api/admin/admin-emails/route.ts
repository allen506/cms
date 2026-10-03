import { NextRequest, NextResponse } from "next/server";
import { execute, query, queryOne } from "@/lib/db-async";
import { requireAdminSession } from "@/lib/route-helpers";
import { v4 as uuidv4 } from "uuid";

// GET all admin emails
export async function GET(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: 401 });
  }

  try {
    const emails = await query<any>(
      "SELECT id, email, created_at FROM admin_emails ORDER BY created_at ASC"
    );
    return NextResponse.json({ emails });
  } catch (error) {
    console.error("Error fetching admin emails:", error);
    return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 });
  }
}

// POST new admin email
export async function POST(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: 401 });
  }

  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // Check if email already exists
    const existing = await queryOne(
      "SELECT id FROM admin_emails WHERE email = ?",
      [email]
    );

    if (existing) {
      return NextResponse.json({ error: "This email is already added" }, { status: 409 });
    }

    const id = uuidv4();
    await execute(
      `INSERT INTO admin_emails (id, email, created_at) VALUES (?, ?, NOW())`,
      [id, email]
    );

    return NextResponse.json({ id, email, message: "Email added successfully" }, { status: 201 });
  } catch (error: any) {
    console.error("Error adding admin email:", error);
    return NextResponse.json({ error: "Failed to add email" }, { status: 500 });
  }
}
