#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://thinkmtb:ThinkMTB@2026\\!Secure@localhost:5432/thinkmtb_order'
});

async function createDesignerAccount() {
  try {
    const result = await pool.query(
      `INSERT INTO designer_accounts (
        id, tenant_id, email, password_hash, full_name, 
        company_name, permissions, active, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW()
      ) RETURNING *;`,
      [
        'designer-001',
        'nct',
        'designer@test.com',
        '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36DxJwFa',
        'Test Designer',
        'Test Design Studio',
        JSON.stringify(['view_requests', 'submit_designs', 'view_approvals']),
        true
      ]
    );

    console.log('✅ Designer account created successfully!');
    console.log('Account details:', result.rows[0]);
    console.log('\nYou can now login at: https://custom.cmssportswear.us/designer/login');
    console.log('Email: designer@test.com');
    console.log('Password: password');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating designer account:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createDesignerAccount();
