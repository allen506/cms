/**
 * Seed the standard CMS Sportswear product catalog, tiered pricing, and add-ons.
 *
 * Idempotent: upserts products by stable id, and replaces platform-level
 * (tenant_id = default tenant) pricing tiers and add-ons for each product.
 *
 * Usage:
 *   DATABASE_URL=postgres://user:pass@host:5432/db node scripts/seed-catalog.js
 * Falls back to local dev credentials if DATABASE_URL is not set.
 */
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const Database = require("better-sqlite3");

const FALLBACK_RATE = 464.54; // placeholder for NOT NULL price_usd; live USD computed at read time

function loadEnvFiles() {
  const envCandidates = [
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), ".env.production"),
    path.join(process.cwd(), ".env.production.local"),
  ];

  for (const envFile of envCandidates) {
    if (!fs.existsSync(envFile)) continue;

    const content = fs.readFileSync(envFile, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const equalsIndex = line.indexOf("=");
      if (equalsIndex === -1) continue;

      const key = line.slice(0, equalsIndex).trim();
      let value = line.slice(equalsIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  }
}

loadEnvFiles();

const STANDARD_DESIGNS = [
  { id: "design-1", name: "Traditional Black", sort_order: 1, description: "Classic black ThinkMTB team design", image_url: "/designs/design1.jpg", designed_for: JSON.stringify(["jersey", "vest", "enduro-jersey", "cycling-jersey"]) },
  { id: "design-2", name: "Traditional White", sort_order: 2, description: "Classic white ThinkMTB team design", image_url: "/designs/design2.jpg", designed_for: JSON.stringify(["jersey", "vest", "enduro-jersey", "cycling-jersey"]) },
  { id: "design-3", name: "Race Green", sort_order: 3, description: "Green race ThinkMTB team design", image_url: "/designs/design3.jpg", designed_for: JSON.stringify(["jersey", "vest", "enduro-jersey", "cycling-jersey"]) },
  { id: "design-4", name: "Race Purple", sort_order: 4, description: "Purple race ThinkMTB team design", image_url: "/designs/design4.jpg", designed_for: JSON.stringify(["jersey", "vest", "enduro-jersey", "cycling-jersey"]) },
  { id: "fd-1", name: "Enduro Black Short Sleeve", sort_order: 10, description: "ThinkMTB legacy enduro short-sleeve design in black", image_url: "/final-designs/1774019147772_Screenshot_2026-03-19_at_12.57.40_PM.png", designed_for: JSON.stringify(["enduro-short"]) },
  { id: "fd-3", name: "Enduro Short Sleeve", sort_order: 12, description: "ThinkMTB legacy enduro short-sleeve design", image_url: "/final-designs/1774019303042_Screenshot_2026-03-19_at_12.57.57_PM.png", designed_for: JSON.stringify(["enduro-short"]) },
  { id: "fd-5", name: "Enduro Green Short Sleeve", sort_order: 14, description: "ThinkMTB legacy enduro short-sleeve design in green", image_url: "/final-designs/1774019502550_Screenshot_2026-03-19_at_12.58.16_PM.png", designed_for: JSON.stringify(["enduro-short"]) },
  { id: "fd-12", name: "Enduro Green Long Sleeve", sort_order: 15, description: "ThinkMTB legacy enduro long-sleeve design in green", image_url: "/final-designs/1774489869859_1000503582.png", designed_for: JSON.stringify(["enduro-jersey"]) },
  { id: "fd-13", name: "Enduro Black Long Sleeve", sort_order: 16, description: "ThinkMTB legacy enduro long-sleeve design in black", image_url: "/final-designs/1774489905710_1000503573.png", designed_for: JSON.stringify(["enduro-jersey"]) },
  { id: "fd-14", name: "Enduro White Long Sleeve", sort_order: 17, description: "ThinkMTB legacy enduro long-sleeve design in white", image_url: "/final-designs/1774489926095_1000503580.png", designed_for: JSON.stringify(["enduro-jersey"]) },
  { id: "design-1787605520817", name: "Enduro Purple Long Sleeve", sort_order: 18, description: "ThinkMTB enduro long-sleeve purple design", image_url: "/designs/design-1787605520814-enduro-purple-long-s.png", designed_for: JSON.stringify(["enduro-jersey"]) },
  { id: "design-1787605788329", name: "Enduro Purple Short Sleeve", sort_order: 19, description: "ThinkMTB enduro short-sleeve purple design", image_url: "/designs/design-1787605788327-enduro-purple-short-.png", designed_for: JSON.stringify(["enduro-short"]) },
  { id: "fd-16", name: "Bib ThinkMTB 2026 Black", sort_order: 20, description: "Legacy ThinkMTB bib design in black", image_url: "/final-designs/1787277944521_Gemini_Generated_Image_c6k784c6k784c6k7.jpeg", designed_for: JSON.stringify(["bib"]) },
  { id: "design-rivian-enduro", name: "ThinkMTB Enduro Jersey", sort_order: 21, description: "Official ThinkMTB enduro jersey design", image_url: "/designs/design-1787605520814-enduro-purple-long-s.png", designed_for: JSON.stringify(["enduro-jersey"]) },
];

const STANDARD_TIERS = (p) => [
  { min: 1, max: 1, crc: p[0] },
  { min: 2, max: 5, crc: p[1] },
  { min: 6, max: 10, crc: p[2] },
  { min: 11, max: 20, crc: p[3] },
  { min: 21, max: 30, crc: p[4] },
  { min: 31, max: 50, crc: p[5] },
  { min: 51, max: 100, crc: p[6] },
];

// Add-on definitions reused across products
const LONG_SLEEVE = {
  id_suffix: "long_sleeve",
  name_en: "Long sleeve",
  name_es: "Manga larga",
  price_crc: 3500,
};
const LOGO_MOLD = {
  id_suffix: "logo_mold",
  name_en: "Stamped logo mold (each)",
  name_es: "Molde de logo estampado (c/u)",
  price_crc: 10000,
};

const PRODUCTS = [
  // ----- Enduro Jerseys -----
  {
    id: "pt_enduro_jersey_long",
    name: "Enduro/BMX/Downhill Jersey (Long Sleeve)",
    category: "enduro-jersey",
    unlock_category: "enduro-jersey",
    example_url: "https://www.cmssportswear.com/jersey-downhill-bmx-enduro-personalizado",
    fit_options: ["unisex"],
    sort_order: 10,
    tiers: STANDARD_TIERS([30000, 28000, 26000, 24000, 22000, 20000, 15000]),
    addons: [],
  },
  {
    id: "pt_enduro_tshirt_short",
    name: "Enduro/BMX/Downhill T-Shirt (Short Sleeve)",
    category: "enduro-jersey",
    unlock_category: "enduro-jersey",
    example_url: "https://www.cmssportswear.com/jersey-downhill-bmx-enduro-personalizado",
    fit_options: ["unisex"],
    sort_order: 20,
    tiers: STANDARD_TIERS([25000, 23000, 21000, 19000, 17000, 15000, 13000]),
    addons: [],
  },

  // ----- Cycling Jerseys (long-sleeve add-on) -----
  {
    id: "pt_cycling_speed",
    name: "CMS Speed Line Jersey (No Zipper)",
    category: "cycling-jersey",
    unlock_category: "cycling-jersey",
    example_url: "https://www.cmssportswear.com/speed-jersey-personalizado",
    fit_options: ["unisex"],
    sort_order: 30,
    tiers: STANDARD_TIERS([35000, 33000, 31000, 29000, 27000, 25000, 20000]),
    addons: [LONG_SLEEVE],
  },
  {
    id: "pt_cycling_semipro",
    name: "CMS Semipro Line Jersey",
    category: "cycling-jersey",
    unlock_category: "cycling-jersey",
    example_url: "https://www.cmssportswear.com/jersey-semipro-personalizado",
    fit_options: ["unisex"],
    sort_order: 40,
    tiers: STANDARD_TIERS([40000, 38000, 36000, 34000, 32000, 30000, 25000]),
    addons: [LONG_SLEEVE],
  },
  {
    id: "pt_cycling_pro",
    name: "CMS Pro Line Jersey",
    category: "cycling-jersey",
    unlock_category: "cycling-jersey",
    example_url: "https://www.cmssportswear.com/linea-pro-personalizados",
    fit_options: ["unisex"],
    sort_order: 50,
    tiers: STANDARD_TIERS([45000, 43000, 41000, 39000, 37000, 35000, 30000]),
    addons: [LONG_SLEEVE],
  },
  {
    id: "pt_cycling_comp1",
    name: "CMS Competition Line 1.0 Jersey",
    category: "cycling-jersey",
    unlock_category: "cycling-jersey",
    example_url: "https://www.cmssportswear.com/jersey-competition-personalizado",
    fit_options: ["unisex"],
    sort_order: 60,
    tiers: STANDARD_TIERS([50000, 48000, 46000, 44000, 42000, 40000, 35000]),
    addons: [LONG_SLEEVE],
  },
  {
    id: "pt_cycling_comp2",
    name: "CMS Competition Line 2.0 Jersey",
    category: "cycling-jersey",
    unlock_category: "cycling-jersey",
    example_url: "https://www.cmssportswear.com/jersey-competition-personalizada-2punto0",
    fit_options: ["unisex"],
    sort_order: 70,
    tiers: STANDARD_TIERS([55000, 53000, 51000, 49000, 47000, 45000, 40000]),
    addons: [LONG_SLEEVE],
  },
  {
    id: "pt_cycling_kids",
    name: "CMS Kids Line Jersey",
    category: "cycling-jersey",
    unlock_category: "cycling-jersey",
    example_url: "https://www.cmssportswear.com/ninos",
    fit_options: ["kids"],
    sort_order: 80,
    tiers: STANDARD_TIERS([25000, 23000, 21000, 19000, 17000, 15000, 13000]),
    addons: [LONG_SLEEVE],
  },

  // ----- Bibs / Licras -----
  {
    id: "pt_bib_pro",
    name: "Licra Pro Line 1.0 (100% Customizable)",
    category: "bib-licra",
    unlock_category: "bib-licra",
    example_url: "https://www.cmssportswear.com/licra-pro-personalizada",
    fit_options: ["unisex"],
    sort_order: 90,
    tiers: STANDARD_TIERS([35000, 32500, 30500, 28500, 26500, 24500, 22500]),
    addons: [],
  },
  {
    id: "pt_bib_comp1",
    name: "Licra Competition Line 1.0 (100% Customizable)",
    category: "bib-licra",
    unlock_category: "bib-licra",
    example_url: "https://www.cmssportswear.com/licra-comptition-personalizada",
    fit_options: ["unisex"],
    sort_order: 100,
    tiers: STANDARD_TIERS([45000, 43000, 41000, 39000, 37000, 35000, 33000]),
    addons: [],
  },
  {
    id: "pt_bib_seamless",
    name: "Licra Competition Seamless 2.0 (Print Only)",
    category: "bib-licra",
    unlock_category: "bib-licra",
    example_url:
      "https://www.cmssportswear.com/product-page/licra-competition-sin-costuras-negra-con-tirantes-hombre",
    fit_options: ["unisex"],
    sort_order: 110,
    tiers: STANDARD_TIERS([60000, 58000, 55000, 53000, 51000, 48000, 46000]),
    addons: [LOGO_MOLD],
  },
];

async function getDefaultTenantId(client) {
  const res = await client.query(
    "SELECT id FROM tenants WHERE slug = 'default' LIMIT 1"
  );
  if (res.rows.length > 0) return res.rows[0].id;

  // Create a default tenant if missing
  const id = "tenant_default";
  await client.query(
    "INSERT INTO tenants (id, slug, name) VALUES ($1, 'default', 'Default Tenant') ON CONFLICT (slug) DO NOTHING",
    [id]
  );
  const again = await client.query(
    "SELECT id FROM tenants WHERE slug = 'default' LIMIT 1"
  );
  return again.rows[0].id;
}

function hasColumn(db, table, columnName) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some((col) => col.name === columnName);
}

function seedSqlite(dbPath) {
  const db = new Database(dbPath);
  const defaultTenantId = "tenant_default";
  const hasTenantColumnForProducts = hasColumn(db, "product_types", "tenant_id");
  const hasTenantColumnForDesigns = hasColumn(db, "designs", "tenant_id");
  const hasTenantColumnForProductDesigns = hasColumn(db, "product_designs", "tenant_id");

  if (hasColumn(db, "tenants", "slug")) {
    const tenantCount = db.prepare("SELECT COUNT(*) as count FROM tenants WHERE slug = ?").get("default").count;
    if (!tenantCount) {
      db.prepare(`INSERT INTO tenants (id, name, slug, admin_email, status, created_at)
        VALUES (?, 'Default Tenant', 'default', 'admin@default.local', 'active', datetime('now'))`).run(defaultTenantId);
    }
  }

  for (const design of STANDARD_DESIGNS) {
    if (hasTenantColumnForDesigns) {
      db.prepare(`INSERT OR REPLACE INTO designs (id, name, description, image_url, active, sort_order, tenant_id, designed_for, created_at)
        VALUES (?, ?, ?, ?, 1, ?, ?, ?, datetime('now'))`).run(
        design.id,
        design.name,
        design.description,
        design.image_url,
        design.sort_order ?? 0,
        defaultTenantId,
        design.designed_for
      );
    } else {
      db.prepare(`INSERT OR REPLACE INTO designs (id, name, description, image_url, active, sort_order, designed_for, created_at)
        VALUES (?, ?, ?, ?, 1, ?, ?, datetime('now'))`).run(
        design.id,
        design.name,
        design.description,
        design.image_url,
        design.sort_order ?? 0,
        design.designed_for
      );
    }
  }

  for (const p of PRODUCTS) {
    if (hasTenantColumnForProducts) {
      db.prepare(`INSERT OR REPLACE INTO product_types
        (id, name, description, category, example_url, active, sort_order, tenant_id, fit_options, created_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, datetime('now'))`).run(
        p.id,
        p.name,
        p.description || null,
        p.category,
        p.example_url,
        p.sort_order,
        defaultTenantId,
        JSON.stringify(p.fit_options)
      );
    } else {
      db.prepare(`INSERT OR REPLACE INTO product_types
        (id, name, description, category, example_url, active, sort_order, fit_options, created_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, datetime('now'))`).run(
        p.id,
        p.name,
        p.description || null,
        p.category,
        p.example_url,
        p.sort_order,
        JSON.stringify(p.fit_options)
      );
    }

    if (hasColumn(db, "pricing_tiers", "tenant_id")) {
      db.prepare("DELETE FROM pricing_tiers WHERE product_type_id = ? AND tenant_id IS NULL").run(p.id);
    } else {
      db.prepare("DELETE FROM pricing_tiers WHERE product_type_id = ?").run(p.id);
    }
    for (const t of p.tiers) {
      const priceUsd = Math.round((t.crc / FALLBACK_RATE) * 100) / 100;
      if (hasColumn(db, "pricing_tiers", "tenant_id")) {
        db.prepare(`INSERT INTO pricing_tiers (product_type_id, min_qty, max_qty, price_crc, price_usd, tenant_id)
          VALUES (?, ?, ?, ?, ?, NULL)`).run(
          p.id,
          t.min,
          t.max,
          t.crc,
          priceUsd
        );
      } else {
        db.prepare(`INSERT INTO pricing_tiers (product_type_id, min_qty, max_qty, price_crc, price_usd)
          VALUES (?, ?, ?, ?, ?)`).run(
          p.id,
          t.min,
          t.max,
          t.crc,
          priceUsd
        );
      }
    }

    db.prepare("DELETE FROM product_designs WHERE product_type_id = ?").run(p.id);
    for (const [index, design] of STANDARD_DESIGNS.entries()) {
      if (hasTenantColumnForProductDesigns) {
        db.prepare(`INSERT INTO product_designs (product_type_id, design_id, sort_order, active, tenant_id, created_at)
          VALUES (?, ?, ?, 1, ?, datetime('now'))`).run(p.id, design.id, index, defaultTenantId);
      } else {
        db.prepare(`INSERT INTO product_designs (product_type_id, design_id, sort_order, active, created_at)
          VALUES (?, ?, ?, 1, datetime('now'))`).run(p.id, design.id, index);
      }
    }
  }

  db.close();
  console.log(`✅ Seeded ${PRODUCTS.length} products and ${STANDARD_DESIGNS.length} default designs in SQLite at ${dbPath}`);
}

async function seed() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("sqlite:")) {
    const dbPath = process.env.DATABASE_URL.replace(/^sqlite:/, "");
    seedSqlite(dbPath);
    return;
  }

  if (!process.env.DATABASE_URL && fs.existsSync(path.join(process.cwd(), "data", "orders.db"))) {
    const dbPath = path.join(process.cwd(), "data", "orders.db");
    seedSqlite(dbPath);
    return;
  }

  const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : new Pool({
        host: "localhost",
        port: 5432,
        database: "thinkmtb_order",
        user: "thinkmtb",
        password: "ThinkMTB@2026!Secure",
      });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const tenantId = await getDefaultTenantId(client);
    console.log(`Using tenant_id = ${tenantId}`);

    const designColumns = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'designs'`
    );
    const hasDesignedFor = designColumns.rows.some((row) => row.column_name === "designed_for");
    if (!hasDesignedFor) {
      await client.query("ALTER TABLE designs ADD COLUMN IF NOT EXISTS designed_for TEXT");
    }

    const productDesignColumns = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'product_designs'`
    );
    const hasProductDesignTenant = productDesignColumns.rows.some((row) => row.column_name === "tenant_id");

    for (const design of STANDARD_DESIGNS) {
      await client.query(
        `INSERT INTO designs (id, tenant_id, name, description, image_url, active, sort_order, designed_for, created_at)
         VALUES ($1, $2, $3, $4, $5, 1, $6, $7, NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           image_url = EXCLUDED.image_url,
           active = 1,
           sort_order = EXCLUDED.sort_order,
           designed_for = EXCLUDED.designed_for`,
        [
          design.id,
          tenantId,
          design.name,
          design.description || null,
          design.image_url || null,
          design.sort_order ?? 0,
          design.designed_for || null,
        ]
      );
    }

    for (const p of PRODUCTS) {
      const fitJson = JSON.stringify(p.fit_options);
      // Upsert product
      await client.query(
        `INSERT INTO product_types
           (id, tenant_id, name, description, category, example_url, sort_order, active, fit_options, unlock_category)
         VALUES ($1,$2,$3,$4,$5,$6,$7,1,$8,$9)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           category = EXCLUDED.category,
           example_url = EXCLUDED.example_url,
           sort_order = EXCLUDED.sort_order,
           active = 1,
           fit_options = EXCLUDED.fit_options,
           unlock_category = EXCLUDED.unlock_category`,
        [
          p.id,
          tenantId,
          p.name,
          p.description || null,
          p.category,
          p.example_url,
          p.sort_order,
          fitJson,
          p.unlock_category,
        ]
      );

      // Replace platform (global) pricing tiers for this product
      await client.query(
        "DELETE FROM pricing_tiers WHERE product_type_id = $1 AND tenant_id IS NULL",
        [p.id]
      );
      for (const t of p.tiers) {
        const priceUsd = Math.round((t.crc / FALLBACK_RATE) * 100) / 100;
        await client.query(
          `INSERT INTO pricing_tiers
             (id, product_type_id, tenant_id, min_qty, max_qty, price_crc, price_usd)
           VALUES ($1,$2,NULL,$3,$4,$5,$6)
           ON CONFLICT (id) DO UPDATE SET
             min_qty = EXCLUDED.min_qty,
             max_qty = EXCLUDED.max_qty,
             price_crc = EXCLUDED.price_crc,
             price_usd = EXCLUDED.price_usd`,
          [
            `tier_${p.id}_${t.min}`,
            p.id,
            t.min,
            t.max,
            t.crc,
            priceUsd,
          ]
        );
      }

      await client.query("DELETE FROM product_designs WHERE product_type_id = $1", [p.id]);
      for (const [index, design] of STANDARD_DESIGNS.entries()) {
        const productDesignId = `pd_${p.id}_${design.id}`;
        if (hasProductDesignTenant) {
          await client.query(
            `INSERT INTO product_designs (id, product_type_id, design_id, sort_order, active, tenant_id, created_at)
             VALUES ($1, $2, $3, $4, 1, $5, NOW())
             ON CONFLICT (id) DO UPDATE SET
               sort_order = EXCLUDED.sort_order,
               active = 1`,
            [productDesignId, p.id, design.id, index, tenantId]
          );
        } else {
          await client.query(
            `INSERT INTO product_designs (id, product_type_id, design_id, sort_order, active, created_at)
             VALUES ($1, $2, $3, $4, 1, NOW())
             ON CONFLICT (id) DO UPDATE SET
               sort_order = EXCLUDED.sort_order,
               active = 1`,
            [productDesignId, p.id, design.id, index]
          );
        }
      }

      // Replace global add-ons for this product
      await client.query(
        "DELETE FROM product_addons WHERE product_type_id = $1 AND tenant_id IS NULL",
        [p.id]
      );
      let addonSort = 0;
      for (const a of p.addons) {
        await client.query(
          `INSERT INTO product_addons
             (id, product_type_id, tenant_id, name_en, name_es, price_crc, active, sort_order)
           VALUES ($1,$2,NULL,$3,$4,$5,1,$6)`,
          [
            `addon_${p.id}_${a.id_suffix}`,
            p.id,
            a.name_en,
            a.name_es,
            a.price_crc,
            addonSort++,
          ]
        );
      }

      console.log(`✓ Seeded ${p.id} (${p.tiers.length} tiers, ${p.addons.length} add-ons)`);
    }

    await client.query("COMMIT");
    console.log(`\n✅ Seeded ${PRODUCTS.length} products successfully.`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed, rolled back:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
