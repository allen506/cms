const { Pool } = require("pg");

async function runMigrations() {
  const pool = new Pool({
    host: "localhost",
    port: 5432,
    database: "thinkmtb_order",
    user: "thinkmtb",
    password: "ThinkMTB@2026!Secure",
  });

  try {
    // Create designer_accounts table
    await pool.query(`
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
    `);

    console.log("✅ Designer accounts table created or already exists");

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_designer_accounts_tenant 
      ON designer_accounts(tenant_id);
    `);
    console.log("✅ Indexes created");

    // Insert test designer if it doesn't exist
    const result = await pool.query(
      "SELECT id FROM designer_accounts WHERE email = $1",
      ["designer@test.com"]
    );

    if (result.rows.length === 0) {
      await pool.query(
        `INSERT INTO designer_accounts (
          id, tenant_id, email, password_hash, full_name, 
          company_name, permissions, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
        [
          "designer-001",
          "nct",
          "designer@test.com",
          "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36DxJwFa",
          "Test Designer",
          "Test Design Studio",
          '["view_requests","submit_designs","view_approvals"]',
          true,
        ]
      );
      console.log("✅ Test designer account created");
    } else {
      console.log("✅ Test designer account already exists");
    }

    console.log("\n✨ Migration completed successfully!");
    console.log("You can now login at: https://custom.cmssportswear.us/designer/login");
    console.log("Email: designer@test.com");
    console.log("Password: password");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
