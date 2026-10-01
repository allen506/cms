import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute, requirePlatformAdmin } from "@/lib/route-helpers";

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
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    // Get tenant to find its slug
    const tenant = await queryOne<any>(
      "SELECT id, slug FROM tenants WHERE id = ?",
      [tenantId]
    );

    console.log("Debug - tenant query result:", { tenantId, tenant });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    if (!tenant.slug) {
      return NextResponse.json({ error: "Tenant has no slug" }, { status: 400 });
    }

    console.log("Debug - about to update password", { 
      newPassword: newPassword.substring(0, 3) + "***",
      slug: tenant.slug
    });

    // Update subdomain_redirects with new password
    const result = await execute(
      `UPDATE subdomain_redirects 
       SET team_password = ?, updated_at = NOW()
       WHERE subdomain = ?`,
      [newPassword, tenant.slug]
    );

    console.log("Debug - execute result:", result);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Subdomain not found for this tenant" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Team password updated successfully",
    });
  } catch (error) {
    console.error("Update team password error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
    return NextResponse.json(
      {
        error: "Failed to update team password",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
