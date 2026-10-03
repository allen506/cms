import { NextRequest, NextResponse } from "next/server";
import {
  queryOne, execute, requireAdminSession, hashPassword, verifyPassword} from "@/lib/db-async";

export async function POST(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Both current and new password are required" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    // For now, check against env var (TODO: use tenant_admins table)
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (!verifyPassword(currentPassword, adminPassword)) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    const hashedPassword = hashPassword(newPassword);
    // TODO: Update tenant_admins table with new password
    // await execute("UPDATE tenant_admins SET password_hash = ? WHERE role = 'platform_admin'", [hashedPassword]);

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
