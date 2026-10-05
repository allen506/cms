import { NextRequest, NextResponse } from "next/server";
import { execute, query, queryOne, withTransaction } from "@/lib/db-async";
import { extractContext, requireAuth } from "@/lib/route-helpers";
import { resolveOrderingCampaign } from "@/lib/campaigns";

interface OrderItem {
  productId: string;
  quantity: number;
  priceCrc: number;
  priceUsd: number;
  designApprovedId?: string;
  designId?: string;
  sizeId?: string;
  fit?: string;
  addonIds?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const ctx = extractContext(request);
    let teamId = request.headers.get("x-team-id");

    // Require auth
    const authError = requireAuth(ctx);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: 400 });
    }

    // Get tenant ID
    const tenant = await queryOne<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = ?",
      [ctx.tenantSlug]
    );

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Fall back to the authenticated user's team when no header is provided
    if (!teamId && ctx.userId) {
      const user = await queryOne<{ team_id: string }>(
        "SELECT team_id FROM user_accounts WHERE id = ? AND tenant_id = ?",
        [ctx.userId, tenant.id]
      );
      teamId = user?.team_id ?? null;
    }

    if (!teamId) {
      return NextResponse.json({ error: "Team could not be determined" }, { status: 400 });
    }

    // Block new orders when the team's campaign has been closed by its captain.
    const campaign = await resolveOrderingCampaign(tenant.id, teamId);
    if (!campaign) {
      return NextResponse.json(
        { error: "This team's order campaign is closed. Contact your team captain." },
        { status: 403 }
      );
    }

    const { items, designRequestId, notes } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one product item is required" }, { status: 400 });
    }

    // Verify design request exists and is approved
    if (designRequestId) {
      const designRequest = await queryOne<any>(
        "SELECT status FROM design_requests WHERE id = ? AND tenant_id = ?",
        [designRequestId, tenant.id]
      );

      if (!designRequest) {
        return NextResponse.json({ error: "Design request not found" }, { status: 404 });
      }

      if (designRequest.status !== "approved") {
        return NextResponse.json({ error: "Design must be approved before placing order" }, { status: 400 });
      }
    }

    // Create order with items in transaction
    return await withTransaction(async (tx) => {
      const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      let totalCrc = 0;
      let totalUsd = 0;

      // Calculate totals from items
      for (const item of items) {
        totalCrc += item.priceCrc * item.quantity;
        totalUsd += item.priceUsd * item.quantity;
      }

      // Create order record
      const orderResult = await tx.execute(
        `
        INSERT INTO orders 
          (id, tenant_id, team_id, user_id, status, total_crc, total_usd, order_number, design_request_id, campaign_id, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
        [
          orderId,
          tenant.id,
          teamId,
          ctx.userId,
          "draft_products_selected",
          totalCrc,
          totalUsd,
          `thnk-${Date.now()}`,
          designRequestId || null,
          campaign.id,
          notes || "",
        ]
      );

      if (orderResult.changes === 0) {
        throw new Error("Failed to create order");
      }

      // Add order items
      for (const item of items) {
        const itemId = `oit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Snapshot design/size names so CSV exports stay stable over time.
        let designNameSnapshot: string | null = null;
        if (item.designId) {
          const design = await tx.queryOne<{ name: string; code: string | null }>(
            "SELECT name, code FROM designs WHERE id = ? AND tenant_id = ?",
            [item.designId, tenant.id]
          );
          if (design) {
            designNameSnapshot = design.code
              ? `${design.code} \u2014 ${design.name}`
              : design.name;
          }
        }

        let sizeNameSnapshot: string | null = null;
        if (item.sizeId) {
          const size = await tx.queryOne<{ name: string }>(
            "SELECT name FROM sizes WHERE id = ?",
            [item.sizeId]
          );
          sizeNameSnapshot = size?.name ?? null;
        }

        await tx.execute(
          `
          INSERT INTO order_items 
            (id, order_id, product_type_id, tenant_id, quantity, price_crc, price_usd, design_id, design_name_snapshot, size_id, size_name_snapshot, fit, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `,
          [
            itemId,
            orderId,
            item.productId,
            tenant.id,
            item.quantity,
            item.priceCrc,
            item.priceUsd,
            item.designId || null,
            designNameSnapshot,
            item.sizeId || null,
            sizeNameSnapshot,
            item.fit || null,
          ]
        );

        // Snapshot selected add-ons for this item
        if (Array.isArray(item.addonIds) && item.addonIds.length > 0) {
          const placeholders = item.addonIds.map(() => "?").join(", ");
          const addonRows = await tx.query<any>(
            `SELECT id, name_en, price_crc
               FROM product_addons
              WHERE id IN (${placeholders})`,
            item.addonIds
          );

          for (const addon of addonRows) {
            const addonItemId = `oia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await tx.execute(
              `
              INSERT INTO order_item_addons
                (id, order_item_id, product_addon_id, name_snapshot, price_crc_snapshot, price_usd_snapshot, created_at)
              VALUES (?, ?, ?, ?, ?, ?, NOW())
            `,
              [
                addonItemId,
                itemId,
                addon.id,
                addon.name_en,
                addon.price_crc,
                0,
              ]
            );
          }
        }
      }

      return NextResponse.json({
          success: true,
          orderId,
          orderNumber: `thnk-${Date.now()}`,
          message: "Order created successfully",
          items: items.length,
          totals: {
            usd: totalUsd,
            crc: totalCrc}}, { status: 201 });
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

