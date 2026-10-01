import { NextRequest } from 'next/server';
import { queryOne, errorResponse, successResponse } from '@/lib/route-helpers';

/**
 * Verify team password
 * POST /api/tenant/verify-password
 * Body: { teamSlug, teamPassword }
 */
export async function POST(request: NextRequest) {
  try {
    const { teamSlug, teamPassword } = await request.json();

    if (!teamSlug || !teamPassword) {
      return errorResponse('Team slug and password are required', 400);
    }

    // Get tenant by slug
    const tenant = await queryOne<any>(
      'SELECT id FROM tenants WHERE slug = ?',
      [teamSlug]
    );

    if (!tenant) {
      return errorResponse('Team not found', 404);
    }

    // Get team password from tenant_settings
    const passwordSetting = await queryOne<any>(
      'SELECT value FROM tenant_settings WHERE tenant_id = ? AND key = ?',
      [tenant.id, 'team_password']
    );

    if (!passwordSetting) {
      return errorResponse('Team password not configured', 404);
    }

    // Verify team password
    if (passwordSetting.value !== teamPassword) {
      return errorResponse('Invalid team password', 401);
    }

    return successResponse({
      success: true,
      message: 'Team password verified',
      teamId: tenant.id,
    });
  } catch (error) {
    console.error('Team password verification error:', error);
    return errorResponse('Failed to verify team password', 500);
  }
}
