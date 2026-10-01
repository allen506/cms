import { NextRequest, NextResponse } from "next/server";
import { query, requirePlatformAdmin, successResponse, errorResponse } from "@/lib/route-helpers";

export async function GET(request: NextRequest) {
  const authError = requirePlatformAdmin(request);
  if (authError) {
    return NextResponse.json(authError, { status: 401 });
  }

  try {
    const products = await query<any>(
      `SELECT id, name, description, active FROM product_types WHERE active = 1 ORDER BY name ASC`
    );

    return NextResponse.json({
      success: true,
      products: products || [],
    });
  } catch (error) {
    console.error("Error fetching products for platform admin:", error);
    return errorResponse("Failed to fetch products", 500);
  }
}
