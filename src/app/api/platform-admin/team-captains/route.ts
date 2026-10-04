import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db-async";
import { requirePlatformAdmin, hashPassword } from "@/lib/route-helpers";
import { v4 as uuidv4 } from "uuid";

interface CaptainRequest {
  email: string;
  tenantId: string;
  isCaptain: boolean;
}

interface CreateCaptainRequest {
  email: string;
  password: string;
  fullName?: string;
  tenantId: string;
}

/** Create a new team captain user for a tenant (used when a team has no members yet) */
export async function POST(request: NextRequest) {
  try {
    const authError = requirePlatformAdmin(request);
    if (authError) {
      return NextResponse.json(authError, { status: 401 });
    }

    const body: CreateCaptainRequest = await request.json();
    const email = body.email?.trim().toLowerCase();
    const { password, fullName, tenantId } = body;

    if (!email || !password || !tenantId) {
      return NextResponse.json(
        { error: "email, password and tenantId are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Ensure tenant exists
    const tenant = await queryOne<{ id: string; name: string }>(
      "SELECT id, name FROM tenants WHERE id = $1",
      [tenantId]
    );
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Prevent duplicate email within the tenant
    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM user_accounts WHERE tenant_id = $1 AND email = $2",
      [tenantId, email]
    );
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists for this team" },
        { status: 400 }
      );
    }

    // Ensure a team row exists for this tenant (team_id drives designs/orders/gating)
    let team = await queryOne<{ id: string }>(
      "SELECT id FROM teams WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 1",
      [tenantId]
    );
    if (!team) {
      const teamId = uuidv4();
      await execute(
        `INSERT INTO teams (id, tenant_id, name, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [teamId, tenantId, tenant.name]
      );
      team = { id: teamId };
    }

    // Create the captain user
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    await execute(
      `INSERT INTO user_accounts
         (id, tenant_id, email, password_hash, team_id, is_team_captain, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 1, 'user', NOW(), NOW())`,
      [userId, tenantId, email, passwordHash, team.id]
    );

    return NextResponse.json(
      {
        success: true,
        message: `Captain ${email} created`,
        user: { id: userId, email, isCaptain: true, teamId: team.id },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create team captain error:", error);
    return NextResponse.json(
      { error: "Failed to create team captain" },
      { status: 500 }
    );
  }
}

/** Update team captain status for a user */
export async function PATCH(request: NextRequest) {
  try {
    const authError = requirePlatformAdmin(request);
    if (authError) {
      return NextResponse.json(authError, { status: 401 });
    }

    const body: CaptainRequest = await request.json();
    const { email, tenantId, isCaptain } = body;

    if (!email || !tenantId) {
      return NextResponse.json(
        { error: "email and tenantId are required" },
        { status: 400 }
      );
    }

    // Update user captain status
    await query(
      `UPDATE user_accounts 
       SET is_team_captain = $1 
       WHERE email = $2 AND tenant_id = $3`,
      [isCaptain ? 1 : 0, email, tenantId]
    );

    // Ensure a promoted captain has a team_id so they can submit design requests.
    if (isCaptain) {
      const current = await queryOne<{ id: string; team_id: string | null }>(
        "SELECT id, team_id FROM user_accounts WHERE email = $1 AND tenant_id = $2",
        [email, tenantId]
      );
      if (current && !current.team_id) {
        let team = await queryOne<{ id: string }>(
          "SELECT id FROM teams WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 1",
          [tenantId]
        );
        if (!team) {
          const tenant = await queryOne<{ name: string }>(
            "SELECT name FROM tenants WHERE id = $1",
            [tenantId]
          );
          const teamId = uuidv4();
          await execute(
            `INSERT INTO teams (id, tenant_id, name, created_at)
             VALUES ($1, $2, $3, NOW())`,
            [teamId, tenantId, tenant?.name || email]
          );
          team = { id: teamId };
        }
        await execute(
          "UPDATE user_accounts SET team_id = $1 WHERE id = $2",
          [team.id, current.id]
        );
      }
    }

    // Verify the update
    const user = await query<any>(
      `SELECT id, email, is_team_captain 
       FROM user_accounts 
       WHERE email = $1 AND tenant_id = $2`,
      [email, tenantId]
    );

    if (user.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User ${email} captain status set to ${isCaptain}`,
      user: {
        id: user[0].id,
        email: user[0].email,
        isCaptain: user[0].is_team_captain === 1 || user[0].is_team_captain === true
      }
    });
  } catch (error) {
    console.error("Update team captain error:", error);
    return NextResponse.json(
      {
        error: "Failed to update team captain status"
      },
      { status: 500 }
    );
  }
}

/** Get list of team members for a tenant */
export async function GET(request: NextRequest) {
  try {
    const authError = requirePlatformAdmin(request);
    if (authError) {
      return NextResponse.json(authError, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get("tenant_id");

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenant_id is required" },
        { status: 400 }
      );
    }

    // Get all users for this tenant
    const users = await query<any>(
      `SELECT id, email, is_team_captain, created_at
       FROM user_accounts
       WHERE tenant_id = $1
       ORDER BY email ASC`,
      [tenantId]
    );

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        isCaptain: u.is_team_captain === 1 || u.is_team_captain === true,
        createdAt: u.created_at
      }))
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch team members"
      },
      { status: 500 }
    );
  }
}
