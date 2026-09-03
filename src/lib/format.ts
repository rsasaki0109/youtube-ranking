// Display-only number formatting. Stored data always keeps raw integers.
// Mirrors scripts/format_utils.py — keep both in sync.

/** 1234 -> "1.2K", 1400000000 -> "1.4B", null -> "-" */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const sign = value < 0 ? "-" : "";
  const n = Math.abs(value);
  if (n < 1000) return `${sign}${Math.round(n).toLocaleString("en-US")}`;
  const units: [number, string][] = [
    [1_000_000_000, "B"],
    [1_000_000, "M"],
    [1_000, "K"],
  ];
  for (const [threshold, suffix] of units) {
    if (n >= threshold) {
      const v = n / threshold;
      const text =
        v >= 100 ? v.toFixed(0) : v >= 10 ? trimZero(v.toFixed(1)) : trimZero(v.toFixed(1));
      return `${sign}${text}${suffix}`;
    }
  }
  return `${sign}${Math.round(n).toLocaleString("en-US")}`;
}

/** 1234567 -> "1,234,567", null -> "-" */
export function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return Math.round(value).toLocaleString("en-US");
}

/** +12300 -> "+12.3K", 0 -> "+0", null -> "-" */
export function formatGrowth(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const n = Math.round(value);
  if (n === 0) return "+0";
  return n > 0 ? `+${formatCompact(n)}` : `-${formatCompact(Math.abs(n))}`;
}

function trimZero(s: string): string {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}
