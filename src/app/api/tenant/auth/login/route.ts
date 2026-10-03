import { NextRequest, NextResponse } from 'next/server';
import {
  queryOne, createSessionToken, verifyPassword} from "@/lib/route-helpers";

export async function POST(request: NextRequest) {
  try {
    const { email, password, teamSlug, teamPassword } = await request.json();
    const tenantSlug = teamSlug || request.headers.get('x-tenant-slug');

    if (!email || !password || !tenantSlug) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get tenant by slug
    const tenant = await queryOne<{ id: string }>(
      'SELECT id FROM tenants WHERE slug = ?',
      [tenantSlug]
    );

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get user account by email
    const user = await queryOne<any>(
      `SELECT id, email, password_hash, team_id, is_team_captain 
       FROM user_accounts 
       WHERE tenant_id = ? AND email = ?`,
      [tenant.id, email]
    );

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Verify password
    if (!(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Create session token
    const token = createSessionToken();
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        team_id: user.team_id,
        isCaptain: user.is_team_captain === 1 || user.is_team_captain === true}});

    response.cookies.set('tenant_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'});

    response.cookies.set('tenant_user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'});

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
