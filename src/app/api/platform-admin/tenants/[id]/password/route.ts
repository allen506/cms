import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { execute, queryOne } from "@/lib/db-async";
import { requirePlatformAdmin } from "@/lib/route-helpers";

/** Update team password for a tenant */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = requirePlatformAdmin(request);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: 401 });
    }

    const { id: tenantId } = await params;
    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.trim() === "") {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    // Get the tenant to make sure it exists
    const tenant = await queryOne<any>(
      "SELECT id FROM tenants WHERE id = ?",
      [tenantId]
    );

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Check if team_password setting already exists
    const existing = await queryOne<any>(
      "SELECT id FROM tenant_settings WHERE tenant_id = ? AND key = ?",
      [tenantId, "team_password"]
    );

    if (existing) {
      // Update existing password
      await execute(
        "UPDATE tenant_settings SET value = ? WHERE tenant_id = ? AND key = ?",
        [newPassword, tenantId, "team_password"]
      );
    } else {
      // Create new password setting with generated UUID
      const settingId = uuidv4();
      await execute(
        "INSERT INTO tenant_settings (id, tenant_id, key, value) VALUES (?, ?, ?, ?)",
        [settingId, tenantId, "team_password", newPassword]
      );
    }

    return NextResponse.json({
      success: true,
      message: "Team password updated successfully"});
  } catch (error) {
    console.error("Update team password error:", error);
    return NextResponse.json({ error: `Failed to update team password: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
