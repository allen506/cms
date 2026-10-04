/**
 * Async Database Abstraction Layer
 * PostgreSQL-focused implementation for Node.js/Next.js
 */

import { Pool, QueryResultRow } from "pg";

let pgPool: Pool | null = null;
let migrationsRan = false;

/**
 * Convert SQLite placeholders (?) to PostgreSQL ($1, $2, etc)
 */
function convertSqliteToPg(sql: string): string {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

/**
 * Run PostgreSQL schema migrations
 */
async function runMigrations(client: any): Promise<void> {
  if (migrationsRan) return;
  
  const migrations = [
    // Tenants
    `CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Teams
    `CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Design workflow tables
    `CREATE TABLE IF NOT EXISTS design_requests (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      team_id TEXT,
      requester_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      archived_at TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS design_request_files (
      id TEXT PRIMARY KEY,
      design_request_id TEXT NOT NULL REFERENCES design_requests(id),
      file_name TEXT NOT NULL,
      file_path TEXT,
      file_type TEXT,
      file_size INTEGER,
      uploaded_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS design_submissions (
      id TEXT PRIMARY KEY,
      design_request_id TEXT NOT NULL REFERENCES design_requests(id),
      designer_id TEXT NOT NULL,
      submission_number INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending',
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS design_submission_files (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL REFERENCES design_submissions(id),
      file_name TEXT NOT NULL,
      file_path TEXT,
      file_type TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS design_comments (
      id TEXT PRIMARY KEY,
      design_request_id TEXT NOT NULL REFERENCES design_requests(id),
      user_id TEXT NOT NULL,
      comment TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Product and pricing tables
    `CREATE TABLE IF NOT EXISTS product_types (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      example_url TEXT,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      fit_options TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS pricing_tiers (
      id TEXT PRIMARY KEY,
      product_type_id TEXT NOT NULL REFERENCES product_types(id),
      tenant_id TEXT REFERENCES tenants(id),
      min_qty INTEGER NOT NULL,
      max_qty INTEGER,
      price_usd DECIMAL(10, 2) NOT NULL,
      price_crc DECIMAL(12, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS price_overrides (
      id TEXT PRIMARY KEY,
      team_id TEXT,
      product_type_id TEXT NOT NULL REFERENCES product_types(id),
      price_usd DECIMAL(10, 2),
      price_crc DECIMAL(12, 2),
      expires_at TIMESTAMP,
      active_from TIMESTAMP,
      active_until TIMESTAMP,
      tenant_id TEXT REFERENCES tenants(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS team_products (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      product_type_id TEXT NOT NULL REFERENCES product_types(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Order tables
    `CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      team_id TEXT,
      order_number TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      design_request_id TEXT REFERENCES design_requests(id),
      status TEXT DEFAULT 'draft_products_selected',
      total_usd DECIMAL(10, 2) DEFAULT 0,
      total_crc DECIMAL(12, 2) DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      product_type_id TEXT NOT NULL REFERENCES product_types(id),
      quantity INTEGER NOT NULL,
      price_usd DECIMAL(10, 2) NOT NULL,
      price_crc DECIMAL(12, 2) NOT NULL,
      tenant_id TEXT REFERENCES tenants(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS order_payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      payment_stage TEXT,
      amount_usd DECIMAL(10, 2),
      amount_crc DECIMAL(12, 2),
      status TEXT DEFAULT 'pending',
      bac_payment_link TEXT,
      payment_reference TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Settings and config
    `CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS tenant_settings (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      key TEXT NOT NULL,
      value TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // User management
    `CREATE TABLE IF NOT EXISTS user_accounts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      email TEXT NOT NULL,
      password_hash TEXT,
      team_id TEXT,
      is_team_captain INTEGER DEFAULT 0,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Tenant admin management
    `CREATE TABLE IF NOT EXISTS tenant_admins (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'admin',
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Subdomain redirects and team config
    `CREATE TABLE IF NOT EXISTS subdomain_redirects (
      id TEXT PRIMARY KEY,
      subdomain TEXT UNIQUE NOT NULL,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      team_password TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Password reset tokens
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES user_accounts(id),
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Admin authentication and sessions
    `CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours')
    )`,

    // Designs
    `CREATE TABLE IF NOT EXISTS designs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      image_url TEXT,
      description TEXT,
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Junction table: products to designs
    `CREATE TABLE IF NOT EXISTS product_designs (
      id TEXT PRIMARY KEY,
      product_type_id TEXT NOT NULL REFERENCES product_types(id),
      design_id TEXT NOT NULL REFERENCES designs(id),
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Sizes
    `CREATE TABLE IF NOT EXISTS sizes (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      code TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Email configuration
    `CREATE TABLE IF NOT EXISTS smtp_settings (
      id TEXT PRIMARY KEY,
      tenant_id TEXT REFERENCES tenants(id),
      host TEXT,
      port INTEGER,
      username TEXT,
      password TEXT,
      from_email TEXT,
      from_name TEXT,
      use_tls BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Payment configuration
    `CREATE TABLE IF NOT EXISTS payment_settings (
      id TEXT PRIMARY KEY,
      tenant_id TEXT REFERENCES tenants(id),
      method TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      config_json TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Admin email recipients
    `CREATE TABLE IF NOT EXISTS admin_emails (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      email TEXT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Designer accounts and authentication
    `CREATE TABLE IF NOT EXISTS designer_accounts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      company_name TEXT,
      permissions JSONB NOT NULL DEFAULT '["view_requests","submit_designs","view_approvals"]'::jsonb,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT unique_tenant_email UNIQUE (tenant_id, email)
    )`,

    `CREATE INDEX IF NOT EXISTS idx_designer_accounts_tenant ON designer_accounts(tenant_id)`,

    // === Phase 0: Catalog/pricing/FX enhancements ===

    // Exchange rate history (replaces broken SQLite-based cache)
    `CREATE TABLE IF NOT EXISTS exchange_rates (
      id SERIAL PRIMARY KEY,
      source TEXT DEFAULT 'BCCR',
      buy_crc DECIMAL(12, 4),
      sell_crc DECIMAL(12, 4),
      fecha DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Unlock category on products (enduro-jersey | cycling-jersey | bib-licra)
    `ALTER TABLE product_types ADD COLUMN IF NOT EXISTS unlock_category TEXT`,

    // Target unlock categories for a design (comma-separated slugs)
    `ALTER TABLE designs ADD COLUMN IF NOT EXISTS categories TEXT`,

    // Selectable product add-ons (e.g., long sleeve, stamped logo mold)
    `CREATE TABLE IF NOT EXISTS product_addons (
      id TEXT PRIMARY KEY,
      product_type_id TEXT NOT NULL REFERENCES product_types(id),
      tenant_id TEXT REFERENCES tenants(id),
      name_en TEXT NOT NULL,
      name_es TEXT NOT NULL,
      price_crc DECIMAL(12, 2) NOT NULL DEFAULT 0,
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_product_addons_product ON product_addons(product_type_id)`,

    // Add-ons captured on an order line (price snapshotted at checkout)
    `CREATE TABLE IF NOT EXISTS order_item_addons (
      id TEXT PRIMARY KEY,
      order_item_id TEXT NOT NULL REFERENCES order_items(id),
      product_addon_id TEXT REFERENCES product_addons(id),
      name_snapshot TEXT,
      price_crc_snapshot DECIMAL(12, 2) DEFAULT 0,
      price_usd_snapshot DECIMAL(10, 2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_order_item_addons_item ON order_item_addons(order_item_id)`,

    // Per-customer price adjustments (extend price_overrides)
    `ALTER TABLE price_overrides ADD COLUMN IF NOT EXISTS adjustment_type TEXT DEFAULT 'fixed'`,
    `ALTER TABLE price_overrides ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5, 2)`,
    `ALTER TABLE price_overrides ADD COLUMN IF NOT EXISTS label TEXT`,

    // Category a design request targets (gates product availability once approved)
    `ALTER TABLE design_requests ADD COLUMN IF NOT EXISTS unlock_category TEXT`,
  ];

  for (const migration of migrations) {
    try {
      await client.query(migration);
      console.log(`✅ ${migration.split('(')[0].trim()}`);
    } catch (err: any) {
      if (!err.message.includes("already exists")) {
        console.error("Migration error:", err.message);
      }
    }
  }

  migrationsRan = true;
  console.log("✅ Database schema initialized");
}

/**
 * Initialize PostgreSQL connection pool
 */
async function initPostgres(): Promise<Pool> {
  if (pgPool) return pgPool;

  const dbUrl = process.env.DATABASE_URL;
  console.log("[db-async] DATABASE_URL set:", !!dbUrl);
  
  if (!dbUrl) {
    const errorMsg = "DATABASE_URL environment variable not set. Cannot connect to PostgreSQL. Make sure DATABASE_URL is set in your environment.";
    console.error("[db-async] ❌ " + errorMsg);
    throw new Error(errorMsg);
  }

  console.log("[db-async] Initializing PostgreSQL pool...");
  pgPool = new Pool({
    connectionString: dbUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test connection and run migrations
  try {
    console.log("[db-async] Testing connection...");
    const testClient = await pgPool.connect();
    await testClient.query("SELECT 1");
    console.log("[db-async] ✅ Connected to PostgreSQL successfully");
    
    // Run migrations once
    await runMigrations(testClient);
    
    testClient.release();
  } catch (error) {
    console.error("[db-async] ❌ Failed to initialize PostgreSQL:", error);
    throw error;
  }

  return pgPool;
}

/**
 * Execute a query
 */
export async function query<T extends QueryResultRow = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  const pool = await initPostgres();
  const pgSql = convertSqliteToPg(sql);
  const result = await pool.query(pgSql, params);
  return result.rows as T[];
}

/**
 * Execute a query and return first result
 */
export async function queryOne<T extends QueryResultRow = any>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute an insert/update/delete
 */
export async function execute(
  sql: string,
  params?: any[]
): Promise<{ changes: number; lastId?: string }> {
  const pool = await initPostgres();
  const pgSql = convertSqliteToPg(sql);
  const result = await pool.query(pgSql, params);
  return { changes: result.rowCount || 0 };
}

/**
 * Execute multiple queries in a transaction
 */
export async function withTransaction<T>(
  callback: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  const pool = await initPostgres();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tx: TransactionClient = {
      query: async <U extends QueryResultRow = any>(
        sql: string,
        params?: any[]
      ) => {
        const pgSql = convertSqliteToPg(sql);
        const result = await client.query(pgSql, params);
        return result.rows as U[];
      },
      queryOne: async <U extends QueryResultRow = any>(
        sql: string,
        params?: any[]
      ) => {
        const pgSql = convertSqliteToPg(sql);
        const result = await client.query(pgSql, params);
        return result.rows.length > 0 ? (result.rows[0] as U) : null;
      },
      execute: async (sql: string, params?: any[]) => {
        const pgSql = convertSqliteToPg(sql);
        const result = await client.query(pgSql, params);
        return { changes: result.rowCount || 0 };
      },
    };

    const result = await callback(tx);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Transaction client interface
 */
export interface TransactionClient {
  query<T extends QueryResultRow = any>(
    sql: string,
    params?: any[]
  ): Promise<T[]>;
  queryOne<T extends QueryResultRow = any>(
    sql: string,
    params?: any[]
  ): Promise<T | null>;
  execute(sql: string, params?: any[]): Promise<{ changes: number }>;
}

/**
 * Close database connections (for testing/shutdown)
 */
export async function closeConnections() {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
}

export { Pool };
