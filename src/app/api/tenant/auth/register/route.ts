import { NextRequest } from 'next/server';
import {
  queryOne,
  execute,
  errorResponse,
  successResponse,
  hashPassword,
} from '@/lib/route-helpers';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { full_name, email, password, teamSlug, teamPassword } = await request.json();
    const tenantSlug = teamSlug || request.headers.get('x-tenant-slug');

    if (!full_name || !email || !password || !tenantSlug) {
      return errorResponse('Missing required fields', 400);
    }

    if (password.length < 8) {
      return errorResponse('Password must be at least 8 characters', 400);
    }

    // Get tenant
    const tenant = await queryOne<{ id: string }>(
      'SELECT id FROM tenants WHERE slug = ?',
      [tenantSlug]
    );

    if (!tenant) {
      return errorResponse('Tenant not found', 404);
    }

    // Check if user already exists
    const existing = await queryOne<any>(
      'SELECT id FROM user_accounts WHERE tenant_id = ? AND email = ?',
      [tenant.id, email]
    );

    if (existing) {
      return errorResponse('Email already in use', 400);
    }

    // Create user account
    const userId = uuidv4();
    const passwordHash = hashPassword(password);

    await execute(
      `INSERT INTO user_accounts (id, tenant_id, email, password_hash, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, tenant.id, email, passwordHash]
    );

    return successResponse(
      {
        success: true,
        user: { id: userId, email },
      },
      201
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Register error:', errorMsg);
    return errorResponse(`An error occurred: ${errorMsg}`, 500);
  }
}
