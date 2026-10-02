import { NextRequest } from 'next/server';
import { queryOne, errorResponse, successResponse } from '@/lib/route-helpers';
import { getDb } from '@/lib/db';

export async function PATCH(request: NextRequest) {
  try {
    const { email, teamSlug, isCaptain } = await request.json();
    
    if (!email || !teamSlug) {
      return errorResponse('Email and teamSlug are required', 400);
    }

    // Get tenant
    const tenant = await queryOne<{ id: string }>(
      'SELECT id FROM tenants WHERE slug = ?',
      [teamSlug]
    );

    if (!tenant) {
      return errorResponse('Tenant not found', 404);
    }

    // Update user captain status
    const db = getDb();
    db.prepare(
      `UPDATE user_accounts 
       SET is_team_captain = ? 
       WHERE email = ? AND tenant_id = ?`
    ).run(isCaptain ? 1 : 0, email, tenant.id);

    // Verify the update
    const user = await queryOne<any>(
      `SELECT id, email, is_team_captain 
       FROM user_accounts 
       WHERE email = ? AND tenant_id = ?`,
      [email, tenant.id]
    );

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse({
      message: `User ${email} is now ${isCaptain ? 'a team captain' : 'not a team captain'}`,
      user: {
        id: user.id,
        email: user.email,
        isCaptain: user.is_team_captain === 1 || user.is_team_captain === true,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Set captain error:', errorMsg);
    return errorResponse(`An error occurred: ${errorMsg}`, 500);
  }
}
