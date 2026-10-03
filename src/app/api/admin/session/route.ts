import { NextRequest, NextResponse } from "next/server";
import {
  execute} from "@/lib/db-async";

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get("admin-session")?.value;
    
    if (token) {
      await execute("DELETE FROM admin_sessions WHERE token = $1", [token]);
    }
    
    const response = NextResponse.json({ message: "Logged out" });
    // Client should clear cookie
    return response;
  } catch (error) {
    console.error("Error logging out:", error);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}
