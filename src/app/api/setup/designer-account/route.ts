import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // Check if test account already exists
    const existing = await query(
      "SELECT id FROM designer_accounts WHERE email = $1",
      ["designer@test.com"]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: true, message: "Designer account already exists" },
        { status: 200 }
      );
    }

    // Insert test designer account
    await query(
      `INSERT INTO designer_accounts (
        id, tenant_id, email, password_hash, full_name, 
        company_name, permissions, active, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW()
      )`,
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

    return NextResponse.json(
      { 
        success: true, 
        message: "Designer account created successfully",
        login_url: "https://custom.cmssportswear.us/designer/login",
        credentials: {
          email: "designer@test.com",
          password: "password"
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Setup failed" },
      { status: 500 }
    );
  }
}
