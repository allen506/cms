#!/usr/bin/env node

const { spawn } = require('child_process');

async function createDesignerAccount() {
  return new Promise((resolve) => {
    const psql = spawn('psql', [
      '-h', 'localhost',
      '-U', 'thinkmtb',
      '-d', 'thinkmtb_order',
      '-c',
      `INSERT INTO designer_accounts (
        id, tenant_id, email, password_hash, full_name, 
        company_name, permissions, active, created_at
      ) VALUES (
        'designer-001',
        'nct',
        'designer@test.com',
        '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36DxJwFa',
        'Test Designer',
        'Test Design Studio',
        '["view_requests","submit_designs","view_approvals"]',
        true,
        NOW()
      );`
    ], {
      env: { ...process.env, PGPASSWORD: 'ThinkMTB@2026!Secure' }
    });

    let output = '';
    let error = '';

    psql.stdout.on('data', (data) => {
      output += data.toString();
    });

    psql.stderr.on('data', (data) => {
      error += data.toString();
    });

    psql.on('close', (code) => {
      if (code === 0 || output.includes('INSERT')) {
        console.log('✅ Designer account created successfully!');
        console.log('\nYou can now login at: https://custom.cmssportswear.us/designer/login');
        console.log('Email: designer@test.com');
        console.log('Password: password');
        process.exit(0);
      } else {
        console.error('❌ Error creating designer account:');
        if (error) console.error(error);
        if (output) console.error(output);
        process.exit(1);
      }
      resolve();
    });
  });
}

createDesignerAccount();

