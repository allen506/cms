import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from "@/lib/db-async";
import { getDb } from '@/lib/db';

export async function PATCH(request: NextRequest) {
  try {
    const { email, teamSlug, isCaptain } = await request.json();
    
    if (!email || !teamSlug) {
      return NextResponse.json({ error: 'Email and teamSlug are required' }, { status: 400 });
    }

    // Get tenant
    const tenant = await queryOne<{ id: string }>(
      'SELECT id FROM tenants WHERE slug = ?',
      [teamSlug]
    );

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: `User ${email} is now ${isCaptain ? 'a team captain' : 'not a team captain'}`,
      user: {
        id: user.id,
        email: user.email,
        isCaptain: user.is_team_captain === 1 || user.is_team_captain === true}});
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Set captain error:', errorMsg);
    return NextResponse.json({ error: `An error occurred: ${errorMsg}` }, { status: 500 });
  }
}
