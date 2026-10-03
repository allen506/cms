import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(req: NextRequest) {
  try {
    const tenantSlug = req.headers.get('x-tenant-slug');
    if (!tenantSlug) {
      return NextResponse.json({ message: 'Tenant slug required' }, { status: 400 });
    }

    // Get tenant ID from tenants table using slug
    const tenantResult = await pool.query(
      'SELECT id FROM tenants WHERE slug = $1',
      [tenantSlug]
    );

    if (tenantResult.rows.length === 0) {
      return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
    }

    const tenantId = tenantResult.rows[0].id;

    // Get user from cookies
    const userId = req.cookies.get('tenant_user_id')?.value;
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is team captain and get their team_id
    const userResult = await pool.query(
      'SELECT is_team_captain, team_id FROM user_accounts WHERE id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_team_captain) {
      return NextResponse.json({ message: 'Only team captains can submit design requests' }, { status: 403 });
    }

    const userTeamId = userResult.rows[0].team_id;

    // Parse form data
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const colors = formData.get('colors') as string || '';
    const specialRequirements = formData.get('specialRequirements') as string || '';
    const files = formData.getAll('files') as File[];

    // Validate required fields
    if (!title || !description) {
      return NextResponse.json(
        { message: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Create design request in database with team_id
    const designRequestId = uuidv4();
    await pool.query(
      `INSERT INTO design_requests (id, tenant_id, team_id, requester_id, title, description, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [designRequestId, tenantId, userTeamId, userId, title, description, 'pending']
    );

    // Handle file uploads if any
    let filesUploaded = 0;
    if (files.length > 0) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'designs', designRequestId);
      
      // Create directory if it doesn't exist
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      for (const file of files) {
        try {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          
          // Generate unique filename
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(2, 8);
          const ext = path.extname(file.name);
          const basename = path.basename(file.name, ext);
          const filename = `${basename}-${timestamp}-${random}${ext}`;
          
          const filepath = path.join(uploadDir, filename);
          await writeFile(filepath, buffer);

          // Insert file record into database
          const fileId = uuidv4();
          await pool.query(
            `INSERT INTO design_request_files (id, design_request_id, filename, file_path, file_size, mime_type, uploaded_by, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [fileId, designRequestId, filename, `/uploads/designs/${designRequestId}/${filename}`, file.size, file.type, userId]
          );
          
          filesUploaded++;
        } catch (err) {
          console.error(`Error uploading file ${file.name}:`, err);
          // Continue with other files even if one fails
        }
      }
    }

    return NextResponse.json(
      {
        message: 'Design request created successfully',
        designRequestId,
        filesUploaded,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Design request error:', error);
    return NextResponse.json(
      { message: 'Failed to create design request' },
      { status: 500 }
    );
  }
}
