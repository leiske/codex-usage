#!/usr/bin/env bun

import { loadCodexAuth } from "./auth/codexAuth";
import { fetchUsage, type FetchFn } from "./fetchUsage";
import { renderBars } from "./renderBars";
import { getStdoutColumns } from "./ui/terminal";

type CliFlags = {
  help: boolean;
  version: boolean;
  verbose: boolean;
};

type CliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

type RunOptions = {
  argv?: string[];
  env?: Record<string, string | undefined>;
  fetchFn?: FetchFn;
  authPath?: string;
  columns?: number | null;
};

function parseCliFlags(argv: string[]): { flags: CliFlags; positionals: string[] } {
  const flags: CliFlags = { help: false, version: false, verbose: false };
  const positionals: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;

    if (a === "--verbose") {
      flags.verbose = true;
      continue;
    }
    if (a === "--help" || a === "-h") {
      flags.help = true;
      continue;
    }
    if (a === "--version" || a === "-v") {
      flags.version = true;
      continue;
    }

    if (a.startsWith("-")) continue;
    positionals.push(a);
  }

  return { flags, positionals };
}

function helpText(): string {
  return [
    "codex-usage - ChatGPT usage",
    "",
    "Usage:",
    "  codex-usage --help",
    "  codex-usage --version",
    "  codex-usage",
    "",
    "Flags:",
    "  --verbose     include reset timestamps",
    "",
    "Examples:",
    "  codex-usage",
    "  CODEX_HOME=/path/to/.codex codex-usage",
  ].join("\n");
}

async function run(options: RunOptions = {}): Promise<CliResult> {
  const argv = options.argv ?? Bun.argv.slice(2);
  const parsed = parseCliFlags(argv);
  const { flags, positionals } = parsed;

  if (flags.version) {
    const pkg = (await Bun.file(new URL("../package.json", import.meta.url)).json()) as { version?: string };
    return { exitCode: 0, stdout: `${pkg.version ?? "0.0.0"}\n`, stderr: "" };
  }

  if (flags.help) {
    return { exitCode: 0, stdout: `${helpText()}\n`, stderr: "" };
  }

  if (positionals.length > 0) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `Unknown command: ${positionals[0]}\nRun: codex-usage --help\n`,
    };
  }

  const env = options.env ?? (Bun.env as Record<string, string | undefined>);
  try {
    const auth = await loadCodexAuth({ env, authPath: options.authPath });
    const url = env.CHATGPT_WHAM_URL ?? "https://chatgpt.com/backend-api/wham/usage";
    const usage = await fetchUsage({
      url,
      authorization: auth.authorization,
      fetchFn: options.fetchFn,
    });

    const out = renderBars(usage, {
      columns: options.columns ?? getStdoutColumns(),
      verbose: flags.verbose,
    });
    return { exitCode: 0, stdout: `${out}\n`, stderr: "" };
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
