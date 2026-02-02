#!/usr/bin/env bun

import { runCommandWithErrors } from "./commands/run";
import { importCommandWithErrors } from "./commands/import";
import { runStoredCommandWithErrors } from "./commands/runStored";
import { storeStatusCommandWithErrors } from "./commands/storeStatus";
import { logoutCommandWithErrors } from "./commands/logout";

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
    "  codex-usage store status    # show active storage backend",
    "  codex-usage logout          # clear stored auth",
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

function parseArgs(argv: string[]): { cmd: string | null; rest: string[]; flags: Set<string> } {
  const flags = new Set<string>();
  const positionals: string[] = [];

  for (const a of argv) {
    if (a === "--help" || a === "-h") flags.add("help");
    else if (a === "--version" || a === "-v") flags.add("version");
    else if (!a.startsWith("-")) positionals.push(a);
  }

  return { cmd: positionals[0] ?? null, rest: positionals.slice(1), flags };
}

const argv = Bun.argv.slice(2);
const parsed = parseArgs(argv);
const { cmd, flags } = parsed;
const rest = parsed.rest;

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

if (cmd === "store" && rest[0] === "status") {
  const result = await storeStatusCommandWithErrors();
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.exitCode);
}

if (cmd === "logout") {
  const result = await logoutCommandWithErrors();
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
