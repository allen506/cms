export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;

    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  return fallback;
}
