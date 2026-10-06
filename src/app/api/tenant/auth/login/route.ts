import { NextRequest, NextResponse } from 'next/server';
import {
  queryOne, createSessionToken, verifyPassword} from "@/lib/route-helpers";

export async function POST(request: NextRequest) {
  try {
    const { email, password, teamSlug, teamPassword } = await request.json();
    const tenantSlug = teamSlug || request.headers.get('x-tenant-slug');
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || !password || !tenantSlug) {
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

    const user = await queryOne<any>(
      `SELECT id, email, password_hash, team_id, is_team_captain, role
       FROM user_accounts
       WHERE tenant_id = ? AND LOWER(email) = LOWER(?)`,
      [tenant.id, normalizedEmail]
    );

    const tenantAdmin = await queryOne<any>(
      `SELECT id, email, password_hash, full_name, role, status
       FROM tenant_admins
       WHERE tenant_id = ? AND LOWER(email) = LOWER(?)`,
      [tenant.id, normalizedEmail]
    );

    const matchingAdminProfile = user && !tenantAdmin
      ? await queryOne<any>(
          `SELECT full_name FROM tenant_admins
           WHERE tenant_id = ? AND LOWER(email) = LOWER(?)`,
          [tenant.id, user.email]
        )
      : tenantAdmin;

    const fullName = user && !user.full_name ? matchingAdminProfile?.full_name : user?.full_name ?? matchingAdminProfile?.full_name ?? null;

    const matchesUser = user ? await verifyPassword(String(password).trim(), user.password_hash) : false;
    const matchesAdmin = tenantAdmin ? await verifyPassword(String(password).trim(), tenantAdmin.password_hash) : false;

    const account = user && (matchesUser || matchesAdmin)
      ? user
      : tenantAdmin && matchesAdmin
        ? tenantAdmin
        : null;

    if (!account) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isCaptain = Boolean(
      (user && (user.is_team_captain === 1 || user.is_team_captain === true)) ||
      (tenantAdmin && (tenantAdmin.role === 'owner' || tenantAdmin.role === 'admin')) ||
      (account.role === 'owner' || account.role === 'admin') ||
      (account.is_team_captain === 1 || account.is_team_captain === true)
    );

    const token = createSessionToken();
    const response = NextResponse.json({
      success: true,
      user: {
        id: user?.id ?? account.id,
        email: user?.email ?? account.email,
        fullName: fullName ?? account.full_name ?? null,
        team_id: user?.team_id ?? account.team_id ?? null,
        isCaptain,
        role: user?.role ?? account.role ?? 'user',
      }
    });

    response.cookies.set('tenant_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    response.cookies.set('tenant_user_id', account.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    if (account.role) {
      response.cookies.set('user_role', account.role, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/'
      });
    }

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
