import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from "@/lib/db-async";

/**
 * Verify team password
 * POST /api/tenant/verify-password
 * Body: { teamSlug, teamPassword }
 */
export async function POST(request: NextRequest) {
  try {
    const { teamSlug, teamPassword } = await request.json();

    if (!teamSlug || !teamPassword) {
      return NextResponse.json({ error: 'Team slug and password are required' }, { status: 400 });
    }

    // Get tenant by slug
    const tenant = await queryOne<any>(
      'SELECT id FROM tenants WHERE slug = ?',
      [teamSlug]
    );

    if (!tenant) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get team password from tenant_settings
    const passwordSetting = await queryOne<any>(
      'SELECT value FROM tenant_settings WHERE tenant_id = ? AND key = ?',
      [tenant.id, 'team_password']
    );

    if (!passwordSetting) {
      return NextResponse.json({ error: 'Team password not configured' }, { status: 404 });
    }

    // Verify team password
    if (passwordSetting.value !== teamPassword) {
      return NextResponse.json({ error: 'Invalid team password' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: 'Team password verified',
      teamId: tenant.id});
  } catch (error) {
    console.error('Team password verification error:', error);
    return NextResponse.json({ error: 'Failed to verify team password' }, { status: 500 });
  }
}
