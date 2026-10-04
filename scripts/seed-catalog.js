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
const { Pool } = require("pg");

const FALLBACK_RATE = 464.54; // placeholder for NOT NULL price_usd; live USD computed at read time

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

async function seed() {
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
           VALUES ($1,$2,NULL,$3,$4,$5,$6)`,
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
