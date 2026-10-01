import { NextRequest } from "next/server";
import { queryOne, execute, requirePlatformAdmin, errorResponse, successResponse } from "@/lib/route-helpers";

/** Update team password for a tenant */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = requirePlatformAdmin(request);
    if (authError) {
      return errorResponse(authError.error, 401);
    }

    const { id: tenantId } = await params;
    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.trim() === "") {
      return errorResponse("Password is required", 400);
    }

    // Get the tenant to make sure it exists
    const tenant = await queryOne<any>(
      "SELECT id FROM tenants WHERE id = ?",
      [tenantId]
    );

    if (!tenant) {
      return errorResponse("Tenant not found", 404);
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
      // Create new password setting
      await execute(
        "INSERT INTO tenant_settings (tenant_id, key, value) VALUES (?, ?, ?)",
        [tenantId, "team_password", newPassword]
      );
    }

    return successResponse({
      success: true,
      message: "Team password updated successfully",
    });
  } catch (error) {
    console.error("Update team password error:", error);
    return errorResponse(
      `Failed to update team password: ${error instanceof Error ? error.message : String(error)}`,
      500
    );
  }
}
