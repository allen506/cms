import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  execute, verifyPassword, createSessionToken, hashPassword} from "@/lib/route-helpers";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const candidatePasswords = new Set<string>();
    const envPassword = process.env.ADMIN_PASSWORD;
    if (envPassword) candidatePasswords.add(envPassword);

    try {
      const dbPasswordRow = getDb()
        .prepare("SELECT value FROM app_settings WHERE key = 'admin_password' LIMIT 1")
        .get() as { value?: string } | undefined;
      if (dbPasswordRow?.value) {
        candidatePasswords.add(dbPasswordRow.value);
      }
    } catch (dbError) {
      console.warn("Could not read admin_password from app_settings:", dbError);
    }

    const validPassword = await Promise.all(
      [...candidatePasswords].map(async (candidate) => {
        if (!candidate) return false;
        if (candidate === password) return true;
        try {
          return await verifyPassword(password, candidate);
        } catch {
          return false;
        }
      })
    );

    if (!validPassword.some(Boolean)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Create admin session token
    const sessionId = uuidv4();
    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    try {
      const usePostgres = Boolean(process.env.DATABASE_URL) && process.env.DB_TYPE !== "sqlite";
      if (usePostgres) {
        try {
          await execute(
            `INSERT INTO admin_sessions (id, token, expires_at) VALUES ($1, $2, $3)`,
            [sessionId, token, expiresAt.toISOString()]
          );
        } catch (dbError) {
          console.warn("PostgreSQL admin session save failed, falling back to SQLite:", dbError);
          getDb().prepare(
            `INSERT INTO admin_sessions (token, expires_at) VALUES (?, ?)`
          ).run(token, expiresAt.toISOString());
        }
      } else {
        getDb().prepare(
          `INSERT INTO admin_sessions (token, expires_at) VALUES (?, ?)`
        ).run(token, expiresAt.toISOString());
      }
    } catch (dbError) {
      console.error("Database error during session creation:", dbError);
      throw dbError;
    }

    // Set secure httpOnly cookie for the session
    const response = NextResponse.json({ 
      valid: true,
      token: token  // Also return token for fallback header-based auth
    });
    response.cookies.set({
      name: "admin-session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/"
    });
    return response;
  } catch (error) {
    console.error("Error verifying admin password:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
