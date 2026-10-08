/**
 * Centralized design category definitions
 * Used across: design upload, admin portal, and user ordering interface
 */

export const DESIGN_CATEGORIES = {
  jersey: "Jersey",
  "enduro-short": "Enduro Short Sleeve",
  "enduro-long": "Enduro Long Sleeve",
  "cycling-jersey": "Cycling Jersey",
  bib: "Bib / Licra",
  vest: "Vest",
  gloves: "Gloves",
  shorts: "Shorts",
  socks: "Socks",
} as const;

export type DesignCategory = keyof typeof DESIGN_CATEGORIES;

export const DESIGN_CATEGORY_KEYS = Object.keys(DESIGN_CATEGORIES) as DesignCategory[];

/**
 * Categories available for upload/assignment (subset of all categories)
 */
export const UPLOADABLE_CATEGORIES = [
  "jersey",
  "enduro-short",
  "enduro-long",
  "cycling-jersey",
  "bib",
  "vest",
] as const;

export type UploadableCategory = typeof UPLOADABLE_CATEGORIES[number];

/**
 * Convert category key to display label
 */
export function getCategoryLabel(category: string): string {
  return DESIGN_CATEGORIES[category as DesignCategory] || category;
}

/**
 * Get all categories as option objects for selects/dropdowns
 */
export function getCategoryOptions() {
  return [
    { value: "", label: "All products" },
    ...UPLOADABLE_CATEGORIES.map((cat) => ({
      value: cat,
      label: getCategoryLabel(cat),
    })),
  ];
}
