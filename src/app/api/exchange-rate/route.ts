import { NextRequest, NextResponse } from "next/server";
import { getExchangeRate } from "@/lib/exchange-rate";

export async function GET(request: NextRequest) {
  try {
    const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";
    const rate = await getExchangeRate(forceRefresh);
    return NextResponse.json(rate);
  } catch (err) {
    console.error("GET /api/exchange-rate error:", err);
    return NextResponse.json(
      { error: "Failed to fetch exchange rate" },
      { status: 500 }
    );
  }
}
