import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db-async";
import { UNLOCK_CATEGORIES } from "@/lib/unlock";

/** Parse a design's designed_for JSON and keep only real product categories. */
function designCategories(designedFor: string | null): string[] {
  if (!designedFor) return [];
  try {
    const arr = JSON.parse(designedFor);
    if (!Array.isArray(arr)) return [];
    return arr.filter((c: string) => (UNLOCK_CATEGORIES as readonly string[]).includes(c));
  } catch {
    return [];
  }
}

/** Map a stored "/uploads/..." path to the file-serving API, encoding segments. */
function fileSrc(fileUrl: string | null): string | null {
  if (!fileUrl) return null;
  if (fileUrl.startsWith("/uploads/")) {
    const rest = fileUrl.slice("/uploads/".length);
    const encoded = rest.split("/").map(encodeURIComponent).join("/");
    return `/api/uploads/${encoded}`;
  }
  return fileUrl;
}

interface ApprovedDesignRow {
  id: string;
  title: string;
  unlock_category: string | null;
  code: string | null;
  file_path: string | null;
}

// GET: approved designs (with preview image) available to the caller's team.
export async function GET(req: NextRequest) {
  try {
    const tenantSlug = req.headers.get("x-tenant-slug");
    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const tenant = await queryOne<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = ?",
      [tenantSlug.toLowerCase()]
    );
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const userId =
      req.headers.get("x-user-id") || req.cookies.get("tenant_user_id")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await queryOne<{ team_id: string | null }>(
      "SELECT team_id FROM user_accounts WHERE id = ? AND tenant_id = ?",
      [userId, tenant.id]
    );
    if (!user?.team_id) {
      return NextResponse.json({ designs: [] });
    }

    const rows = await query<ApprovedDesignRow>(
      `SELECT
          dr.id,
          dr.title,
          dr.unlock_category,
          NULL::text AS code,
          (
            SELECT f.file_path
              FROM design_submissions ds
              JOIN design_submission_files f ON f.design_submission_id = ds.id
             WHERE ds.design_request_id = dr.id AND ds.status = 'approved'
             ORDER BY ds.submitted_at DESC NULLS LAST, f.created_at ASC
             LIMIT 1
          ) AS file_path
        FROM design_requests dr
       WHERE dr.tenant_id = ? AND dr.team_id = ? AND dr.status = 'approved'
       ORDER BY dr.created_at DESC`,
      [tenant.id, user.team_id]
    );

    const designs = rows.map((r) => ({
      id: r.id,
      name: r.title,
      categories: r.unlock_category ? [r.unlock_category] : [],
      imageUrl: fileSrc(r.file_path),
    }));

    // Admin-assigned catalog designs (skip the design-request step). Categories
    // come from the design's designed_for (an optional team override wins).
    const assigned = await query<{
      design_id: string;
      name: string;
      designed_for: string | null;
      category: string | null;
    }>(
      `SELECT td.design_id, d.name, d.designed_for, td.category
         FROM team_designs td
         JOIN designs d ON d.id = td.design_id
        WHERE td.tenant_id = ? AND td.team_id = ? AND d.active = 1
        ORDER BY d.sort_order, d.name`,
      [tenant.id, user.team_id]
    );

    for (const a of assigned) {
      const derived = designCategories(a.designed_for);
      const categories =
        a.category && (UNLOCK_CATEGORIES as readonly string[]).includes(a.category)
          ? [a.category]
          : derived;
      designs.push({
        id: a.design_id,
        name: a.name,
        categories,
        imageUrl: `/api/designs/${a.design_id}/image`,
      });
    }

    return NextResponse.json({ designs });
  } catch (err) {
    console.error("approved-designs error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
