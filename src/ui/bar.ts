export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 100) return 100;
  return value;
}

export function renderBar(percent: number, width = 24): string {
  const w = Math.max(0, Math.floor(width));
  const p = clampPercent(percent);
  const filled = Math.round((p / 100) * w);
  const empty = Math.max(0, w - filled);

  return `[${"#".repeat(filled)}${"-".repeat(empty)}]`;
}
