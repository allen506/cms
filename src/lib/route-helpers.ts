/**
 * Route Handler Helper for Async Database Operations
 * Simplifies the pattern of converting sync endpoints to async
 */

import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute, withTransaction, TransactionClient } from "./db-async";
import bcryptjs from "bcryptjs";

export interface RouteContext {
  tenantSlug: string;
  userId: string | null;
  userRole: string | null;
  request: NextRequest;
}

/**
 * Extract context from request headers and cookies
 */
export function extractContext(request: NextRequest): RouteContext {
  // Get tenant slug from header or default
  const tenantSlug = request.headers.get("x-tenant-slug") || "default";
  
  // Try to get userId from headers first, then from cookies
  let userId = request.headers.get("x-user-id");
  if (!userId) {
    userId = request.cookies.get("tenant_user_id")?.value || null;
  }
  
  // Try to get userRole from headers first, then from cookies  
  let userRole = request.headers.get("x-user-role");
  if (!userRole) {
    userRole = request.cookies.get("user_role")?.value || null;
  }
  
  return {
    tenantSlug,
    userId,
    userRole,
    request,
  };
}

/**
 * Require authentication
 */
export function requireAuth(context: RouteContext): { error: string } | null {
  if (!context.userId) {
    return { error: "User ID required" };
  }
  return null;
}

/**
 * Require admin role
 */
export function requireAdmin(context: RouteContext): { error: string } | null {
  if (context.userRole !== "admin") {
    return { error: "Admin role required" };
  }
  return null;
}

/**
 * Error response helper
 */
export function errorResponse(message: string, status: number = 500) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Wrapper for GET handlers with automatic error handling
 */
export async function getHandler(
  handler: (context: RouteContext) => Promise<NextResponse>
) {
  return async function (request: NextRequest, context?: any) {
    try {
      const ctx = extractContext(request);
      return await handler(ctx);
    } catch (error) {
      console.error("Handler error:", error);
      return errorResponse("Internal server error", 500);
    }
  };
}

/**
 * Wrapper for POST/PUT/DELETE handlers with automatic error handling
 */
export async function mutationHandler(
  handler: (request: NextRequest, context: RouteContext) => Promise<NextResponse>
) {
  return async function (request: NextRequest, routeContext?: any) {
    try {
      const ctx = extractContext(request);
      return await handler(request, ctx);
    } catch (error) {
      console.error("Handler error:", error);
      return errorResponse("Internal server error", 500);
    }
  };
}

/**
 * Platform admin authentication check
 */
export function requirePlatformAdmin(request: NextRequest): { error: string } | null {
  const token = request.cookies.get("platform_admin_token");
  if (!token) {
    return { error: "Unauthorized" };
  }
  return null;
}

/**
 * Hash password for storage (using bcryptjs)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcryptjs.genSalt(12);
  return bcryptjs.hash(password, salt);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

/**
 * Create secure session cookie token
 */
export function createSessionToken(): string {
  const crypto = require("crypto");
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Check if admin is authenticated via session cookie
 */
export async function requireAdminSession(request: NextRequest): Promise<{ error: string } | null> {
  const token = request.cookies.get("admin-session")?.value;
  if (!token) {
    return { error: "Unauthorized" };
  }
  
  // Verify session exists and is not expired
  const session = await queryOne<any>(
    "SELECT token FROM admin_sessions WHERE token = ? AND expires_at > NOW()",
    [token]
  );
  
  if (!session) {
    return { error: "Session expired or invalid" };
  }
  
  return null;
}

/**
 * Convenience exports for database operations
 */
export { query, queryOne, execute, withTransaction };
export type { TransactionClient };
