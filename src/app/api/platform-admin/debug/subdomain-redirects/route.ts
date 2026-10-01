import { NextRequest } from "next/server";
import { query, requirePlatformAdmin, errorResponse, successResponse } from "@/lib/route-helpers";

/** Debug endpoint to see what columns exist in subdomain_redirects */
export async function GET(request: NextRequest) {
  try {
    const authError = requirePlatformAdmin(request);
    if (authError) {
      return errorResponse(authError.error, 401);
    }

    // Try to get all data from subdomain_redirects
    const allRecords = await query<any>(
      "SELECT * FROM subdomain_redirects LIMIT 5"
    );

    return successResponse({
      recordCount: allRecords.length,
      records: allRecords,
      columns: allRecords.length > 0 ? Object.keys(allRecords[0]) : ["No records found"],
    });
  } catch (error) {
    console.error("Debug error:", error);
    return errorResponse(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
      500
    );
  }
}
