import { NextRequest, NextResponse } from 'next/server';
import {
  queryOne, verifyPassword, createSessionToken, requirePlatformAdmin} from "@/lib/route-helpers";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Try to get admin from database
    const admin = await queryOne<any>(
      'SELECT id, password_hash FROM tenant_admins WHERE email = ?',
      [email]
    );

    if (admin && (await verifyPassword(password, admin.password_hash))) {
      // Valid credentials - create session
      const token = createSessionToken();
      const response = NextResponse.json({ success: true });
      response.cookies.set('platform_admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
      });
      return response;
    }

    // Only use environment variable credentials if no database admin exists
    const ENV_ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL;
    const ENV_ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD;

    if (!ENV_ADMIN_EMAIL || !ENV_ADMIN_PASSWORD) {
      // No credentials configured - authentication disabled
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (email === ENV_ADMIN_EMAIL && password === ENV_ADMIN_PASSWORD) {
      const token = createSessionToken();
      const response = NextResponse.json({ success: true });
      response.cookies.set('platform_admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24});
      return response;
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
