export function getStdoutColumns(): number | null {
  const out = process.stdout as any;
  if (!out || !out.isTTY) return null;
  const cols = out.columns;
  if (typeof cols !== "number" || !Number.isFinite(cols) || cols <= 0) return null;
  return cols;
}

export function computeBarWidth(columns: number | null, preferred = 24): number {
  if (!columns) return preferred;
  if (columns >= 80) return preferred;

  // Rough budget: label + spaces + percent + reset text.
  // Keep a minimum so bars remain readable.
  const min = 10;
  const w = Math.floor(columns - 40);
  return Math.max(min, Math.min(preferred, w));
}
