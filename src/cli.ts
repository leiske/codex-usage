#!/usr/bin/env bun

const API_URL = "https://chatgpt.com/backend-api/wham/usage";
const BAR_WIDTH = 24;
const HELP_TEXT = [
  "codex-usage - ChatGPT usage",
  "",
  "Usage:",
  "  codex-usage",
  "  codex-usage --help",
].join("\n");

type CliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

type UsageWindow = {
  used_percent?: unknown;
  reset_after_seconds?: unknown;
};

function numberFromUnknown(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getWindow(data: unknown, key: "primary_window" | "secondary_window"): {
  usedPercent: number;
  resetAfterSeconds: number;
} {
  const obj = data as {
    rate_limit?: {
      primary_window?: UsageWindow;
      secondary_window?: UsageWindow;
    };
  };

  const window = obj.rate_limit?.[key];
  const usedPercent = numberFromUnknown(window?.used_percent);
  const resetAfterSeconds = numberFromUnknown(window?.reset_after_seconds);

  if (usedPercent === null || resetAfterSeconds === null) {
    throw new Error(`Unexpected JSON: missing rate_limit.${key}.used_percent/reset_after_seconds`);
  }

  return { usedPercent, resetAfterSeconds };
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 100) return 100;
  return value;
}

function renderBar(percent: number): string {
  const p = clampPercent(percent);
  const filled = Math.round((p / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  return `[${"#".repeat(filled)}${"-".repeat(empty)}]`;
}

function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "0s";

  const seconds = Math.floor(totalSeconds);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
  return `${remainder}s`;
}

function renderLine(label: string, usedPercent: number, resetAfterSeconds: number): string {
  const p = clampPercent(usedPercent);
  const pct = Math.round(p);
  return `${label.padEnd(6, " ")} ${renderBar(p)} ${pct}% (resets in ${formatDuration(resetAfterSeconds)})`;
}

function renderUsage(data: unknown): string {
  const primary = getWindow(data, "primary_window");
  const secondary = getWindow(data, "secondary_window");

  return [
    renderLine("5-hour", primary.usedPercent, primary.resetAfterSeconds),
    renderLine("Weekly", secondary.usedPercent, secondary.resetAfterSeconds),
  ].join("\n");
}

function getAuthPath(): string {
  const codexHome = Bun.env.CODEX_HOME?.trim();
  if (codexHome) return `${codexHome.replace(/\/+$/, "")}/auth.json`;

  const home = Bun.env.HOME?.trim();
  if (!home) throw new Error("Cannot determine auth path (set CODEX_HOME or HOME)");
  return `${home.replace(/\/+$/, "")}/.codex/auth.json`;
}

async function loadAuthorization(): Promise<string> {
  const authPath = getAuthPath();
  const file = Bun.file(authPath);

  if (!(await file.exists())) {
    throw new Error(`Missing auth to query usage. Expected Codex auth file: ${authPath}`);
  }

  const data = (await file.json()) as { tokens?: { access_token?: unknown } };
  const token = typeof data.tokens?.access_token === "string" ? data.tokens.access_token.trim() : "";
  if (!token) {
    throw new Error(`Invalid Codex auth file at ${authPath}: missing tokens.access_token`);
  }

  return `Bearer ${token}`;
}

async function fetchUsage(authorization: string): Promise<unknown> {
  const response = await fetch(API_URL, {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization,
    },
  });

  if (!response.ok) {
    let body = "";
    try {
      body = (await response.text()).trim();
    } catch {
      body = "";
    }

    const detail = body ? ` ${body.slice(0, 200)}` : "";
    throw new Error(`Request failed. HTTP ${response.status}.${detail}`);
  }

  return await response.json();
}

async function run(argv: string[] = Bun.argv.slice(2)): Promise<CliResult> {
  if (argv.length > 0) {
    if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h")) {
      return { exitCode: 0, stdout: `${HELP_TEXT}\n`, stderr: "" };
    }
    return {
      exitCode: 2,
      stdout: "",
      stderr: `Unknown argument: ${argv[0]}\nRun: codex-usage --help\n`,
    };
  }

  try {
    const authorization = await loadAuthorization();
    const usage = await fetchUsage(authorization);
    return { exitCode: 0, stdout: `${renderUsage(usage)}\n`, stderr: "" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { exitCode: 1, stdout: "", stderr: `${msg}\n` };
  }
}

if (import.meta.main) {
  const result = await run();
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.exitCode);
}

export { run };
