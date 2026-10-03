#!/bin/bash

# Parse DATABASE_URL to extract components
# FORMAT: postgresql://user:password@host:port/database
# Replace \! with !  in password
export PGPASSWORD='ThinkMTB@2026!Secure'

psql -h localhost -p 5432 -U thinkmtb -d thinkmtb_order << 'SQL'
CREATE TABLE IF NOT EXISTS designer_accounts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  company_name TEXT,
  permissions JSONB NOT NULL DEFAULT '["view_requests","submit_designs","view_approvals"]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT unique_tenant_email UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_designer_accounts_tenant ON designer_accounts(tenant_id);

INSERT INTO designer_accounts (
  id, tenant_id, email, password_hash, full_name, 
  company_name, permissions, active
) VALUES (
  'designer-001',
  'nct',
  'designer@test.com',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36DxJwFa',
  'Test Designer',
  'Test Design Studio',
  '["view_requests","submit_designs","view_approvals"]'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

SELECT '✅ Designer accounts table and test account created!' as status;
SQL
