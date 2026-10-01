import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute, requirePlatformAdmin } from "@/lib/route-helpers";

/** Get a specific tenant by ID */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = requirePlatformAdmin(request);
    if (authError) {
      return NextResponse.json(authError, { status: 401 });
    }

    const { id: tenantId } = await params;

    const tenant = await queryOne<any>(
      "SELECT id, name, slug, admin_email, status, created_at FROM tenants WHERE id = $1",
      [tenantId]
    );

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("Get tenant error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenant", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/** Update a tenant */
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
    const { name, slug, admin_email, status } = body;

    // Validate required fields
    if (!name || !slug || !admin_email) {
      return NextResponse.json(
        { error: "Missing required fields: name, slug, admin_email" },
        { status: 400 }
      );
    }

    // Validate status
    if (status && !["active", "suspended"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'active' or 'suspended'" },
        { status: 400 }
      );
    }

    // Check if tenant exists
    const tenant = await queryOne<any>(
      "SELECT id FROM tenants WHERE id = $1",
      [tenantId]
    );

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Update tenant
    await execute(
      "UPDATE tenants SET name = $1, slug = $2, admin_email = $3, status = $4 WHERE id = $5",
      [name, slug, admin_email, status || "active", tenantId]
    );

    return NextResponse.json({ success: true, id: tenantId });
  } catch (error) {
    console.error("Update tenant error:", error);
    return NextResponse.json(
      { error: "Failed to update tenant", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/** Delete a tenant */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = requirePlatformAdmin(request);
    if (authError) {
      return NextResponse.json(authError, { status: 401 });
    }

    const { id: tenantId } = await params;

    // Check if tenant exists
    const tenant = await queryOne<any>(
      "SELECT id FROM tenants WHERE id = $1",
      [tenantId]
    );

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Delete tenant (cascade should handle related records)
    await execute("DELETE FROM tenants WHERE id = $1", [tenantId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete tenant error:", error);
    return NextResponse.json(
      { error: "Failed to delete tenant", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
