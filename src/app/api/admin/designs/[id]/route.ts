import { NextRequest, NextResponse } from "next/server";
import { execute, queryOne, withTransaction } from "@/lib/db-async";
import { requireAdminSession } from "@/lib/route-helpers";
import { writeFileSync, mkdirSync, unlinkSync } from "fs";
import path from "path";

const { normalizeDesignUpdatePayload } = require("@/lib/design-normalization");

const UPLOAD_DIR = path.join(process.cwd(), "public/designs");
mkdirSync(UPLOAD_DIR, { recursive: true });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: 401 });
  }

  try {
    const { id } = await params;
    const design = await queryOne<any>(
      "SELECT * FROM designs WHERE id = ?",
      [id]
    );

    if (!design) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    return NextResponse.json({ design });
  } catch (error) {
    console.error("Error fetching design:", error);
    return NextResponse.json({ error: "Failed to fetch design" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: 401 });
  }

  try {
    const { id } = await params;
    const contentType = request.headers.get("content-type");
    let body: Record<string, any> = {};
    let file: File | null = null;

    // Handle both JSON and FormData
    if (contentType?.includes("application/json")) {
      body = await request.json();
    } else if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData();
      body.name = formData.get("name") as string;
      body.description = formData.get("description") as string;
      body.active = formData.get("active") === "true" ? 1 : 0;
      body.sort_order = formData.get("sort_order")
        ? parseInt(formData.get("sort_order") as string)
        : undefined;
      body.designed_for = formData.get("designed_for") as string;
      file = formData.get("file") as File | null;
    }

    const normalizedBody = normalizeDesignUpdatePayload(body);

    // Check if design exists
    const existing = await queryOne<any>(
      "SELECT * FROM designs WHERE id = ?",
      [id]
    );

    if (!existing) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    const updates = [];
    const values = [];

    if (normalizedBody.name !== undefined) {
      updates.push("name = ?");
      values.push(normalizedBody.name);
    }
    if (normalizedBody.description !== undefined) {
      updates.push("description = ?");
      values.push(normalizedBody.description || null);
    }
    if (normalizedBody.active !== undefined) {
      updates.push("active = ?");
      values.push(normalizedBody.active);
    }
    if (normalizedBody.sort_order !== undefined) {
      updates.push("sort_order = ?");
      values.push(normalizedBody.sort_order);
    }
    if (normalizedBody.designed_for !== undefined) {
      updates.push("designed_for = ?");
      values.push(normalizedBody.designed_for || null);
    }

    // Handle file upload
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!validTypes.includes(file.type)) {
        return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, WebP, GIF allowed." }, { status: 400 });
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
      }

      // Delete old image if exists
      if (existing.image_url) {
        try {
          const oldFilepath = path.join(process.cwd(), "public", existing.image_url);
          unlinkSync(oldFilepath);
        } catch {
          // File may not exist
        }
      }

      // Save new image
      const buffer = await file.arrayBuffer();
      const timestamp = Date.now();
      const filename = `design-${timestamp}-${(
        body.name || "unknown"
      )
        .toLowerCase()
        .replace(/\s+/g, "-")
        .substring(0, 20)}.${file.type.split("/")[1]}`;
      const filepath = path.join(UPLOAD_DIR, filename);

      writeFileSync(filepath, Buffer.from(buffer));

      updates.push("image_url = ?");
      values.push(`/designs/${filename}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push("updated_at = NOW()");
    values.push(id);
    const sql = `UPDATE designs SET ${updates.join(", ")} WHERE id = ?`;
    await execute(sql, values);

    return NextResponse.json({ message: "Design updated successfully" });
  } catch (error) {
    console.error("Error updating design:", error);
    return NextResponse.json({ error: "Failed to update design" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminSession(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Check if design has order items
    const orders = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM order_items WHERE design_id = ?",
      [id]
    );

    if (orders && orders.count > 0) {
      return NextResponse.json({ error: `Cannot delete design with ${orders.count} existing orders` }, { status: 400 });
    }

    // Get design to find image
    const design = await queryOne<any>(
      "SELECT image_url FROM designs WHERE id = ?",
      [id]
    );

    if (!design) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    // Delete in a transaction: child records first, then the design
    await withTransaction(async (client) => {
      await execute("DELETE FROM product_designs WHERE design_id = ?", [id]);
      await execute("DELETE FROM designs WHERE id = ?", [id]);
    });

    // Delete the image file after the DB transaction succeeds
    if (design.image_url) {
      try {
        const filepath = path.join(process.cwd(), "public", design.image_url);
        unlinkSync(filepath);
      } catch {
        // File may not exist or be in a different location — not fatal
      }
    }

    return NextResponse.json({ message: "Design deleted successfully" });
  } catch (error) {
    console.error("Error deleting design:", error);
    return NextResponse.json({ error: "Failed to delete design" }, { status: 500 });
  }
}
