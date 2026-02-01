import { UnexpectedResponseError } from "./errors";
import { formatDuration } from "./time/formatDuration";
import { clampPercent, renderBar } from "./ui/bar";

type WindowLike = {
  used_percent?: unknown;
  reset_after_seconds?: unknown;
};

function numberFromUnknown(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function getWindow(data: unknown, key: "primary_window" | "secondary_window"): WindowLike {
  const obj = data as any;
  return (obj?.rate_limit?.[key] ?? {}) as WindowLike;
}

export type RenderBarsOptions = {
  width?: number;
};

export function renderBars(data: unknown, options: RenderBarsOptions = {}): string {
  const width = options.width ?? 24;

  const primary = getWindow(data, "primary_window");
  const secondary = getWindow(data, "secondary_window");

  const pUsed = numberFromUnknown(primary.used_percent);
  const pReset = numberFromUnknown(primary.reset_after_seconds);
  const sUsed = numberFromUnknown(secondary.used_percent);
  const sReset = numberFromUnknown(secondary.reset_after_seconds);

  if (pUsed === null || pReset === null) {
    throw new UnexpectedResponseError(
      "Unexpected JSON: missing rate_limit.primary_window.used_percent/reset_after_seconds",
    );
  }
  if (sUsed === null || sReset === null) {
    throw new UnexpectedResponseError(
      "Unexpected JSON: missing rate_limit.secondary_window.used_percent/reset_after_seconds",
    );
  }

  const lines = [
    renderLine("5-hour", pUsed, pReset, width),
    renderLine("Weekly", sUsed, sReset, width),
  ];

  return lines.join("\n");
}

function renderLine(label: string, usedPercent: number, resetAfterSeconds: number, width: number): string {
  const p = clampPercent(usedPercent);
  const pct = Math.round(p);
  const bar = renderBar(p, width);
  const resetIn = formatDuration(resetAfterSeconds);
  const padLabel = label.padEnd(6, " ");
  return `${padLabel} ${bar} ${pct}% (resets in ${resetIn})`;
}
