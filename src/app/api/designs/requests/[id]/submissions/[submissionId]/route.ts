import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db-async";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const { id, submissionId } = await params;
    const tenantSlug = request.headers.get("x-tenant-slug");

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get tenant ID
    const tenants = await query(
      "SELECT id FROM tenants WHERE slug = $1",
      [tenantSlug]
    );

    if (tenants.length === 0) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    const tenantId = tenants[0].id;

    // Get design request
    const designRequests = await query(
      "SELECT * FROM design_requests WHERE id = $1 AND tenant_id = $2",
      [id, tenantId]
    );

    if (designRequests.length === 0) {
      return NextResponse.json(
        { error: "Design request not found" },
        { status: 404 }
      );
    }

    const { status } = await request.json();

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be approved or rejected" },
        { status: 400 }
      );
    }

    // Update submission status
    await query(
      `UPDATE design_submissions SET status = $1 WHERE id = $2`,
      [status, submissionId]
    );

    // If approved, update design request
    if (status === "approved") {
      await query(
        "UPDATE design_requests SET status = $1 WHERE id = $2",
        ["approved", id]
      );
    }

    // If rejected, keep request in pending status
    if (status === "rejected") {
      await query(
        "UPDATE design_requests SET status = $1 WHERE id = $2",
        ["pending", id]
      );
    }

    return NextResponse.json({
      success: true,
      message: `Design submission ${status} successfully`,
    });
  } catch (error) {
    console.error("Error updating submission:", error);
    const errorDetails = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update submission", details: errorDetails },
      { status: 500 }
    );
  }
}
