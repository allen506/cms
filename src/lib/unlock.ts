import { query, queryOne } from "@/lib/db-async";

export const UNLOCK_CATEGORIES = [
  "enduro-jersey",
  "cycling-jersey",
  "bib-licra",
] as const;

export const UNLOCK_CATEGORY_ALIASES: Record<string, string[]> = {
  jersey: ["jersey", "enduro-jersey", "cycling-jersey", "enduro-short", "enduro-long"],
  "enduro-jersey": ["enduro-jersey", "enduro-short", "enduro-long", "jersey"],
  "cycling-jersey": ["cycling-jersey", "jersey", "enduro-short", "enduro-long"],
  "enduro-short": ["enduro-short", "enduro-jersey", "cycling-jersey", "jersey"],
  "enduro-long": ["enduro-long", "enduro-jersey", "cycling-jersey", "jersey"],
  bib: ["bib", "bib-licra"],
  "bib-licra": ["bib-licra", "bib"],
  vest: ["vest"],
  gloves: ["gloves"],
  shorts: ["shorts"],
  socks: ["socks"],
};

export type UnlockCategory = (typeof UNLOCK_CATEGORIES)[number];

export function expandUnlockCategories(rawCategories: Array<string | null | undefined>): string[] {
  const expanded = new Set<string>();

  for (const raw of rawCategories) {
    if (!raw) continue;

    const trimmed = raw.trim();
    if (!trimmed) continue;

    expanded.add(trimmed);

    const aliases = UNLOCK_CATEGORY_ALIASES[trimmed] ?? [];
    for (const alias of aliases) expanded.add(alias);
  }

  return [...expanded];
}

/**
 * Returns the set of unlock categories available to a team: a category is
 * unlocked once the team has an approved design request targeting it.
 *
 * Backward-safe: if a team has approved design requests but none are tagged
 * with a category, all categories are unlocked (so products appear once any
 * design is ready). Errors default to all-unlocked to avoid blocking orders.
 */
export async function getUnlockedCategories(
  teamId: string | null | undefined
): Promise<Set<string>> {
  const all = new Set<string>(UNLOCK_CATEGORIES);
  if (!teamId) return new Set();

  try {
    const rows = await query<{ unlock_category: string | null }>(
      `SELECT DISTINCT unlock_category
         FROM design_requests
        WHERE team_id = $1 AND status = 'approved'`,
      [teamId]
    );

    // Admin-assigned designs also unlock products (skipping the design request).
    // Their categories come from designed_for (optional team override wins).
    const assigned = await query<{ designed_for: string | null; category: string | null }>(
      `SELECT d.designed_for, td.category
         FROM team_designs td
         JOIN designs d ON d.id = td.design_id
        WHERE td.team_id = $1`,
      [teamId]
    );

    const assignedCats: string[] = [];
    for (const a of assigned) {
      const candidates = [a.category, a.designed_for].filter(Boolean) as string[];
      for (const candidate of candidates) {
        if (!candidate) continue;
        if (candidate.startsWith("[") || candidate.startsWith("{")) {
          try {
            const arr = JSON.parse(candidate);
            if (Array.isArray(arr)) {
              assignedCats.push(...expandUnlockCategories(arr.map((v) => String(v))));
            }
            continue;
          } catch {
            // Ignore malformed JSON and fall through below.
          }
        }
        assignedCats.push(...expandUnlockCategories([candidate]));
      }
    }

    if (rows.length === 0 && assigned.length === 0) return new Set(); // nothing unlocked

    const tagged = [
      ...rows.map((r) => r.unlock_category),
      ...assignedCats,
    ].flatMap((value) => expandUnlockCategories([value]));

    // Unlocking exists but nothing is category-tagged → unlock everything.
    if (tagged.length === 0) return all;

    return new Set(tagged);
  } catch (err) {
    console.error("[unlock] failed to compute unlocked categories:", err);
    return all;
  }
}

export interface TeamOrderAccess {
  /** The logged-in user's team id, if resolved. */
  teamId: string | null;
  /** Categories unlocked by approved designs for the team. */
  unlocked: Set<string>;
  /** True when at least one approved design makes products available. */
  hasApprovedDesign: boolean;
}

/**
 * Resolve the current (cookie-authenticated) user's team for a tenant slug and
 * compute whether they have any approved design unlocking product selection.
 * Used by server components to gate the "Select Products" step.
 */
export async function getCurrentTeamOrderAccess(
  tenantSlug: string
): Promise<TeamOrderAccess> {
  const empty: TeamOrderAccess = {
    teamId: null,
    unlocked: new Set(),
    hasApprovedDesign: false,
  };

  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const userId = cookieStore.get("tenant_user_id")?.value || null;
    if (!userId) return empty;

    const tenant = await queryOne<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = ?",
      [tenantSlug.toLowerCase()]
    );
    if (!tenant) return empty;

    const user = await queryOne<{ team_id: string | null }>(
      "SELECT team_id FROM user_accounts WHERE id = ? AND tenant_id = ?",
      [userId, tenant.id]
    );
    if (!user?.team_id) return empty;

    const unlocked = await getUnlockedCategories(user.team_id);
    return {
      teamId: user.team_id,
      unlocked,
      hasApprovedDesign: unlocked.size > 0,
    };
  } catch (err) {
    console.error("[unlock] failed to resolve team order access:", err);
    return empty;
  }
}
