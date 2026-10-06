import test from "node:test";
import assert from "node:assert/strict";

import { expandUnlockCategories } from "./unlock.ts";

test("expands cycling and enduro design categories to product categories", () => {
  const categories = expandUnlockCategories(["cycling-jersey", "enduro-short", "bib-licra"]);

  assert.ok(categories.includes("jersey"));
  assert.ok(categories.includes("enduro-short"));
  assert.ok(categories.includes("enduro-long"));
  assert.ok(categories.includes("bib"));
  assert.ok(categories.includes("bib-licra"));
});

test("keeps existing product category aliases stable", () => {
  const categories = expandUnlockCategories(["enduro-jersey"]);

  assert.deepEqual(categories.sort(), ["enduro-jersey", "enduro-long", "enduro-short", "jersey"].sort());
});
