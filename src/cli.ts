#!/usr/bin/env bun

import { runCommandWithErrors } from "./commands/run";
import { importCommandWithErrors } from "./commands/import";
import { runStoredCommandWithErrors } from "./commands/runStored";

function helpText(): string {
  return [
    "codex-usage - ChatGPT usage bars (unofficial)",
    "",
    "Usage:",
    "  codex-usage --help",
    "  codex-usage --version",
    "  codex-usage                # run using stored auth (Phase 2)",
    "  codex-usage import          # read cURL from stdin and store auth",
    "  codex-usage run             # run using env vars (Phase 1 helper)",
    "",
    "Examples:",
    "  cat curl.txt | codex-usage import",
    "  codex-usage",
    "  CHATGPT_AUTHORIZATION=... [CHATGPT_COOKIE=...] codex-usage run",
    "",
    "Dev helpers:",
    "  bun run ./src/cli.ts --help",
    "  bun test",
  ].join("\n");
}

function parseArgs(argv: string[]): { cmd: string | null; flags: Set<string> } {
  const flags = new Set<string>();
  let cmd: string | null = null;

  for (const a of argv) {
    if (a === "--help" || a === "-h") flags.add("help");
    else if (a === "--version" || a === "-v") flags.add("version");
    else if (!a.startsWith("-") && cmd === null) cmd = a;
  }

  return { cmd, flags };
}

const argv = Bun.argv.slice(2);
const { cmd, flags } = parseArgs(argv);

if (flags.has("version")) {
  const pkg = (await Bun.file(new URL("../package.json", import.meta.url)).json()) as {
    version?: string;
  };
  process.stdout.write(`${pkg.version ?? "0.0.0"}\n`);
  process.exit(0);
}

if (flags.has("help")) {
  process.stdout.write(helpText());
  process.stdout.write("\n");
  process.exit(0);
}

if (cmd === null) {
  const result = await runStoredCommandWithErrors();
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.exitCode);
}

if (cmd === "import") {
  const result = await importCommandWithErrors();
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.exitCode);
}

if (cmd === "run") {
  const result = await runCommandWithErrors();
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.exitCode);
}

process.stderr.write(`Unknown command: ${cmd}\n`);
process.stderr.write("Run: codex-usage --help\n");
process.exit(2);
