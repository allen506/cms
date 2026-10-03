import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db-async";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "final-designs");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const name = body.name?.toString().trim();
    const description = (body.description ?? "").toString().trim();

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM final_designs WHERE id = ?",
      [id]
    );
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await execute(
      "UPDATE final_designs SET name = ?, description = ?, updated_at = NOW() WHERE id = ?",
      [name, description, id]
    );

    const updated = await queryOne<any>(
      "SELECT * FROM final_designs WHERE id = ?",
      [id]
    );
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/final-designs/[id] error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const row = await queryOne<{ image_url: string }>(
      "SELECT image_url FROM final_designs WHERE id = ?",
      [id]
    );

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await execute("DELETE FROM final_designs WHERE id = ?", [id]);

    // Remove file from disk (only files inside our upload directory)
    const filename = path.basename(row.image_url);
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath) && filePath.startsWith(UPLOAD_DIR + path.sep)) {
      fs.unlinkSync(filePath);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/final-designs/[id] error:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
