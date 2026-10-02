import { NextRequest } from 'next/server';
import { queryOne, errorResponse, successResponse } from '@/lib/route-helpers';

export async function GET(request: NextRequest) {
  try {
    const tenantSlug = request.headers.get('x-tenant-slug');
    
    // Get user ID from cookie
    const cookieHeader = request.headers.get('cookie') || '';
    const userIdMatch = cookieHeader.match(/tenant_user_id=([^;]+)/);
    const userId = userIdMatch?.[1];

    if (!userId || !tenantSlug) {
      return errorResponse('Not authenticated', 401);
    }

    // Get tenant
    const tenant = await queryOne<{ id: string }>(
      'SELECT id FROM tenants WHERE slug = ?',
      [tenantSlug]
    );

    if (!tenant) {
      return errorResponse('Tenant not found', 404);
    }

    // Get user profile
    const user = await queryOne<any>(
      `SELECT id, email, is_team_captain, team_id, role
       FROM user_accounts 
       WHERE id = ? AND tenant_id = ?`,
      [userId, tenant.id]
    );

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        isCaptain: user.is_team_captain === 1 || user.is_team_captain === true,
        teamId: user.team_id,
        role: user.role,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Profile error:', errorMsg);
    return errorResponse(`An error occurred: ${errorMsg}`, 500);
  }
}
