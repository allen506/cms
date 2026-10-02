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

    console.log('📝 Register request:', { full_name, email, teamSlug, tenantSlug });

    if (!full_name || !email || !password || !tenantSlug) {
      return errorResponse('Missing required fields', 400);
    }

    if (password.length < 8) {
      return errorResponse('Password must be at least 8 characters', 400);
    }

    // Get tenant
    console.log('🔍 Looking for tenant with slug:', tenantSlug);
    const tenant = await queryOne<{ id: string }>(
      'SELECT id FROM tenants WHERE slug = ?',
      [tenantSlug]
    );

    if (!tenant) {
      console.error('❌ Tenant not found:', tenantSlug);
      return errorResponse('Tenant not found', 404);
    }

    console.log('✓ Tenant found:', tenant.id);

    // Check if user already exists
    console.log('🔍 Checking for existing user:', email);
    const existing = await queryOne<any>(
      'SELECT id FROM user_accounts WHERE tenant_id = ? AND email = ?',
      [tenant.id, email]
    );

    if (existing) {
      console.error('❌ Email already in use:', email);
      return errorResponse('Email already in use', 400);
    }

    console.log('✓ Email is available');

    // Create user account
    const userId = uuidv4();
    const passwordHash = hashPassword(password);

    console.log('📝 Creating user:', { userId, email, tenant_id: tenant.id });
    await execute(
      `INSERT INTO user_accounts (id, tenant_id, email, password_hash, full_name, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [userId, tenant.id, email, passwordHash, full_name]
    );

    console.log('✓ User created successfully:', userId);

    return successResponse(
      {
        success: true,
        user: { id: userId, email, full_name },
      },
      201
    );
  } catch (error) {
    console.error('Register error:', error instanceof Error ? error.message : error);
    console.error('Register error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return errorResponse('An error occurred', 500);
  }
}
