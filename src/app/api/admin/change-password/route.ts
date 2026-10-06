import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  execute, requireAdminSession, hashPassword, verifyPassword} from "@/lib/route-helpers";

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

    const candidatePasswords = new Set<string>();
    const envPassword = process.env.ADMIN_PASSWORD;
    if (envPassword) candidatePasswords.add(envPassword);

    try {
      const dbPasswordRow = getDb()
        .prepare("SELECT value FROM app_settings WHERE key = 'admin_password' LIMIT 1")
        .get() as { value?: string } | undefined;
      if (dbPasswordRow?.value) {
        candidatePasswords.add(dbPasswordRow.value);
      }
    } catch (dbError) {
      console.warn("Could not read admin_password from app_settings:", dbError);
    }

    const isCurrentPasswordValid = await Promise.all(
      [...candidatePasswords].map(async (candidate) => {
        if (!candidate) return false;
        if (candidate === currentPassword) return true;
        try {
          return await verifyPassword(currentPassword, candidate);
        } catch {
          return false;
        }
      })
    );

    if (!isCurrentPasswordValid.some(Boolean)) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    await hashPassword(newPassword);
    await execute("UPDATE app_settings SET value = ? WHERE key = 'admin_password'", [newPassword]);

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
