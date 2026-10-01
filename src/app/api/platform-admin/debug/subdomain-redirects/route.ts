import { NextRequest } from "next/server";
import { query, requirePlatformAdmin, errorResponse, successResponse } from "@/lib/route-helpers";

/** Debug endpoint to see actual columns in subdomain_redirects */
export async function GET(request: NextRequest) {
  try {
    const authError = requirePlatformAdmin(request);
    if (authError) {
      return errorResponse(authError.error, 401);
    }

    // Get column info from information_schema
    const columns = await query<any>(
      `SELECT column_name, data_type, is_nullable 
       FROM information_schema.columns 
       WHERE table_name = 'subdomain_redirects' 
       ORDER BY ordinal_position`
    );

    // Try to get all data from subdomain_redirects
    const allRecords = await query<any>(
      "SELECT * FROM subdomain_redirects LIMIT 5"
    );

    return successResponse({
      tableColumns: columns.map(c => ({
        name: c.column_name,
        type: c.data_type,
        nullable: c.is_nullable
      })),
      recordCount: allRecords.length,
      records: allRecords,
    });
  } catch (error) {
    console.error("Debug error:", error);
    return errorResponse(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
      500
    );
  }
}
