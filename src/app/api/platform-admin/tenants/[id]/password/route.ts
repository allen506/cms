import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
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
      "SELECT id, slug FROM tenants WHERE id = ?",
      [tenantId]
    );

    if (!tenant) {
      return errorResponse("Tenant not found", 404);
    }

    if (!tenant.slug) {
      return errorResponse("Tenant has no slug configured", 400);
    }

    // Check if subdomain redirect already exists
    let redirect = await queryOne<any>(
      "SELECT id FROM subdomain_redirects WHERE tenant_id = ?",
      [tenantId]
    );

    // If it doesn't exist, create it
    if (!redirect) {
      const redirectId = uuidv4();
      const redirectUrl = `https://${tenant.slug}.cmssportswear.us`;
      
      await execute(
        `INSERT INTO subdomain_redirects (id, subdomain, redirect_url, is_team_portal, tenant_id, team_password, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [redirectId, tenant.slug, redirectUrl, 1, tenantId, newPassword]
      );

      return successResponse({
        success: true,
        message: "Team portal password configured successfully",
      });
    } else {
      // Update existing record
      await execute(
        "UPDATE subdomain_redirects SET team_password = ?, updated_at = NOW() WHERE tenant_id = ?",
        [newPassword, tenantId]
      );

      return successResponse({
        success: true,
        message: "Team password updated successfully",
      });
    }
  } catch (error) {
    console.error("Update team password error:", error);
    return errorResponse(
      `Failed to update team password: ${error instanceof Error ? error.message : String(error)}`,
      500
    );
  }
}
