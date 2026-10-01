import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute, requirePlatformAdmin, errorResponse, successResponse } from "@/lib/route-helpers";

/** Update team password for a tenant */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = requirePlatformAdmin(request);
    if (authError) {
      return NextResponse.json(authError, { status: 401 });
    }

    const { id: tenantId } = await params;
    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.trim() === "") {
      return errorResponse("Password is required", 400);
    }

    // Get subdomain redirect for this tenant
    const redirect = await queryOne<any>(
      "SELECT id FROM subdomain_redirects WHERE tenant_id = ?",
      [tenantId]
    );

    if (!redirect) {
      return errorResponse("Team subdomain not configured", 404);
    }

    // Update using tenant_id to find the record
    await execute(
      "UPDATE subdomain_redirects SET team_password = ?, updated_at = NOW() WHERE tenant_id = ?",
      [newPassword, tenantId]
    );

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
