/**
 * Per-team order campaigns.
 *
 * Each team has at most one "open" campaign at a time. Team captains open/close
 * campaigns; while a campaign is open members can add orders. Closing a campaign
 * freezes it (no new orders) so the captain can export a CSV and either email it
 * to CMS or submit it through the system for an admin to take over.
 */

import { query, queryOne, execute } from "./db-async";

export type CampaignStatus = "open" | "closed" | "submitted";

export interface TeamCampaign {
  id: string;
  tenant_id: string;
  team_id: string;
  name: string | null;
  status: CampaignStatus;
  bac_payment_link: string | null;
  closed_by: string | null;
  closed_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

function generateCampaignId(): string {
  return `camp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Get the current open campaign for a team, if any.
 */
export async function getOpenCampaign(
  tenantId: string,
  teamId: string
): Promise<TeamCampaign | null> {
  return queryOne<TeamCampaign>(
    `SELECT * FROM team_campaigns
      WHERE tenant_id = ? AND team_id = ? AND status = 'open'
      ORDER BY created_at DESC
      LIMIT 1`,
    [tenantId, teamId]
  );
}

/**
 * Get the most recent campaign for a team regardless of status.
 */
export async function getCurrentCampaign(
  tenantId: string,
  teamId: string
): Promise<TeamCampaign | null> {
  return queryOne<TeamCampaign>(
    `SELECT * FROM team_campaigns
      WHERE tenant_id = ? AND team_id = ?
      ORDER BY created_at DESC
      LIMIT 1`,
    [tenantId, teamId]
  );
}

/**
 * Resolve the campaign a new order should attach to.
 *
 * Ordering is open by default: if the team has never had a campaign, one is
 * bootstrapped on the first order. If the most recent campaign is closed or
 * submitted, ordering is blocked (returns null) until a captain re-opens it.
 */
export async function resolveOrderingCampaign(
  tenantId: string,
  teamId: string,
  name?: string
): Promise<TeamCampaign | null> {
  const current = await getCurrentCampaign(tenantId, teamId);
  if (current) {
    return current.status === "open" ? current : null;
  }

  const id = generateCampaignId();
  await execute(
    `INSERT INTO team_campaigns (id, tenant_id, team_id, name, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'open', NOW(), NOW())`,
    [id, tenantId, teamId, name || null]
  );

  const created = await queryOne<TeamCampaign>(
    `SELECT * FROM team_campaigns WHERE id = ?`,
    [id]
  );
  if (!created) {
    throw new Error("Failed to create campaign");
  }
  return created;
}

export async function getCampaignById(
  id: string,
  tenantId: string
): Promise<TeamCampaign | null> {
  return queryOne<TeamCampaign>(
    `SELECT * FROM team_campaigns WHERE id = ? AND tenant_id = ?`,
    [id, tenantId]
  );
}

/**
 * Close a team's open campaign. Returns the closed campaign, or null if there
 * was no open campaign.
 */
export async function closeCampaign(
  tenantId: string,
  teamId: string,
  closedBy: string | null
): Promise<TeamCampaign | null> {
  const open = await getOpenCampaign(tenantId, teamId);
  if (!open) return null;

  await execute(
    `UPDATE team_campaigns
        SET status = 'closed', closed_by = ?, closed_at = NOW(), updated_at = NOW()
      WHERE id = ?`,
    [closedBy, open.id]
  );
  return getCampaignById(open.id, tenantId);
}

/**
 * Re-open a closed (not yet submitted) campaign.
 */
export async function reopenCampaign(
  tenantId: string,
  campaignId: string
): Promise<TeamCampaign | null> {
  const campaign = await getCampaignById(campaignId, tenantId);
  if (!campaign || campaign.status === "submitted") return null;

  await execute(
    `UPDATE team_campaigns
        SET status = 'open', closed_by = NULL, closed_at = NULL, updated_at = NOW()
      WHERE id = ?`,
    [campaignId]
  );
  return getCampaignById(campaignId, tenantId);
}

/**
 * Mark a campaign as submitted to admins for fulfilment.
 */
export async function submitCampaign(
  tenantId: string,
  campaignId: string
): Promise<TeamCampaign | null> {
  const campaign = await getCampaignById(campaignId, tenantId);
  if (!campaign) return null;

  await execute(
    `UPDATE team_campaigns
        SET status = 'submitted', submitted_at = NOW(), updated_at = NOW()
      WHERE id = ?`,
    [campaignId]
  );
  return getCampaignById(campaignId, tenantId);
}

export async function setCampaignBacLink(
  tenantId: string,
  campaignId: string,
  link: string | null
): Promise<TeamCampaign | null> {
  await execute(
    `UPDATE team_campaigns
        SET bac_payment_link = ?, updated_at = NOW()
      WHERE id = ? AND tenant_id = ?`,
    [link, campaignId, tenantId]
  );
  return getCampaignById(campaignId, tenantId);
}

export async function listCampaigns(
  tenantId: string,
  teamId?: string
): Promise<TeamCampaign[]> {
  if (teamId) {
    return query<TeamCampaign>(
      `SELECT * FROM team_campaigns
        WHERE tenant_id = ? AND team_id = ?
        ORDER BY created_at DESC`,
      [tenantId, teamId]
    );
  }
  return query<TeamCampaign>(
    `SELECT * FROM team_campaigns WHERE tenant_id = ? ORDER BY created_at DESC`,
    [tenantId]
  );
}

/**
 * Whether a team can currently accept new member orders. Open by default until
 * a captain closes the current campaign.
 */
export async function isTeamOrderingOpen(
  tenantId: string,
  teamId: string
): Promise<boolean> {
  const current = await getCurrentCampaign(tenantId, teamId);
  return current === null || current.status === "open";
}
