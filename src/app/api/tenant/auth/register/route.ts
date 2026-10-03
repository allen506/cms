import { NextRequest, NextResponse } from 'next/server';
import {
  queryOne, execute, hashPassword} from "@/lib/db-async";
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { full_name, email, password, teamSlug, teamPassword } = await request.json();
    const tenantSlug = teamSlug || request.headers.get('x-tenant-slug');

    if (!full_name || !email || !password || !tenantSlug) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Get tenant
    const tenant = await queryOne<{ id: string }>(
      'SELECT id FROM tenants WHERE slug = ?',
      [tenantSlug]
    );

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Check if user already exists
    const existing = await queryOne<any>(
      'SELECT id FROM user_accounts WHERE tenant_id = ? AND email = ?',
      [tenant.id, email]
    );

    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    // Check if this is the first user for the team
    const userCount = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM user_accounts WHERE tenant_id = ?',
      [tenant.id]
    );

    const isFirstUser = (userCount?.count ?? 0) === 0;

    // Create user account
    const userId = uuidv4();
    const passwordHash = hashPassword(password);

    await execute(
      `INSERT INTO user_accounts (id, tenant_id, email, password_hash, is_team_captain, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [userId, tenant.id, email, passwordHash, isFirstUser ? 1 : 0]
    );

    return NextResponse.json({
        success: true,
        user: { 
          id: userId, 
          email,
          isCaptain: isFirstUser}}, { status: 201 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Register error:', errorMsg);
    return NextResponse.json({ error: `An error occurred: ${errorMsg}` }, { status: 500 });
  }
}
