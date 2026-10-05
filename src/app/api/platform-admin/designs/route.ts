import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db-async";
import { requirePlatformAdmin } from "@/lib/route-helpers";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "public/designs");
mkdirSync(UPLOAD_DIR, { recursive: true });

export async function GET(request: NextRequest) {
  const authError = requirePlatformAdmin(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenant_id");
    const teamId = searchParams.get("team_id");

    if (teamId && !tenantId) {
      return NextResponse.json({ error: "tenant_id is required when filtering by team_id" }, { status: 400 });
    }

    const filters: string[] = [];
    const params: string[] = [];
    if (tenantId) {
      filters.push("tenant_id = ?");
      params.push(tenantId);
    }
    if (teamId) {
      filters.push("team_id = ?");
      params.push(teamId);
    }

    const whereClause = filters.length > 0 ? ` WHERE ${filters.join(" AND ")}` : "";

    const designs = await query<any>(
      `SELECT 
        id,
        name,
        description,
        image_url,
        active,
        sort_order,
        designed_for,
        created_at,
        tenant_id,
        team_id
      FROM designs${whereClause}
      ORDER BY sort_order ASC`,
      params
    );

    return NextResponse.json({ designs: designs || [] });
  } catch (error) {
    console.error("Error fetching designs for platform admin:", error);
    return NextResponse.json({ error: "Failed to fetch designs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = requirePlatformAdmin(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const active = formData.get("active") === "true" ? 1 : 0;
    const sort_order = parseInt(formData.get("sort_order") as string) || 999;
    const designed_for = formData.get("designed_for") as string;
    const tenant_id = (formData.get("tenant_id") as string | null) || "default-tenant";
    const team_id = (formData.get("team_id") as string | null) || null;
    const file = formData.get("file") as File | null;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    let image_url = "";

    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!validTypes.includes(file.type)) {
        return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, WebP, GIF allowed." }, { status: 400 });
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
      }

      const buffer = await file.arrayBuffer();
      const timestamp = Date.now();
      const filename = `design-${timestamp}-${name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .substring(0, 20)}.${file.type.split("/")[1]}`;
      const filepath = path.join(UPLOAD_DIR, filename);

      writeFileSync(filepath, Buffer.from(buffer));
      image_url = `/designs/${filename}`;
    }

    const id = uuidv4();

    await execute(
      `INSERT INTO designs (id, tenant_id, team_id, name, description, image_url, active, sort_order, designed_for, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        tenant_id,
        team_id,
        name,
        description || null,
        image_url || null,
        active,
        sort_order,
        designed_for || null,
      ]
    );

    return NextResponse.json({ id, image_url, message: "Design created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating design for platform admin:", error);
    return NextResponse.json({ error: "Failed to create design" }, { status: 500 });
  }
}
