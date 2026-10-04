import { query } from "@/lib/db-async";

export const UNLOCK_CATEGORIES = [
  "enduro-jersey",
  "cycling-jersey",
  "bib-licra",
] as const;

export type UnlockCategory = (typeof UNLOCK_CATEGORIES)[number];

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

    if (rows.length === 0) return new Set(); // no approved designs yet

    const tagged = rows
      .map((r) => r.unlock_category)
      .filter((c): c is string => !!c);

    // Approved designs exist but none tagged → unlock everything.
    if (tagged.length === 0) return all;

    return new Set(tagged);
  } catch (err) {
    console.error("[unlock] failed to compute unlocked categories:", err);
    return all;
  }
}
