import { v4 as uuidv4 } from "uuid";
import { hashPassword } from "../lib/auth-utils";
import { queryOne, execute } from "../lib/db-async";

const testDesignerEmail = "designer@test.com";
const testDesignerPassword = "TestDesigner123!";

async function createTestDesigner() {
  try {
    console.log("🔍 Checking if test designer exists...");

    // Check if test designer already exists
    const existing = await queryOne(
      "SELECT id FROM designer_accounts WHERE email = ?",
      [testDesignerEmail]
    );

    if (existing) {
      console.log("✅ Test designer already exists:", testDesignerEmail);
      return;
    }

    console.log("📝 Creating test designer account...");

    const designerId = uuidv4();
    const passwordHash = hashPassword(testDesignerPassword);

    // Get first tenant
    const tenant = await queryOne("SELECT id FROM tenants LIMIT 1");
    
    if (!tenant) {
      throw new Error("No tenants found in database");
    }

    await execute(
      `INSERT INTO designer_accounts 
        (id, tenant_id, email, password_hash, full_name, company_name, permissions, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        designerId,
        tenant.id,
        testDesignerEmail,
        passwordHash,
        "Test Designer",
        "Test Design Studio",
        JSON.stringify(["view_requests", "submit_designs", "view_approvals"]),
        1,
      ]
    );

    console.log("✅ Test designer created successfully!");
    console.log(`\n📧 Email: ${testDesignerEmail}`);
    console.log(`🔑 Password: ${testDesignerPassword}`);
    console.log(`\n🔗 Login URL: https://custom.cmssportswear.us/designer/login`);
  } catch (error) {
    console.error("❌ Error creating test designer:", error);
    process.exit(1);
  }
}

createTestDesigner();
