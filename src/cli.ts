#!/usr/bin/env bun

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
    "  codex-usage                # run (stored auth preferred; env fallback)",
    "  codex-usage import          # read cURL from stdin and store auth",
    "  codex-usage status          # show active storage backend",
    "  codex-usage logout          # clear stored auth",
    "",
    "Examples:",
    "  cat curl.txt | codex-usage import",
    "  codex-usage",
    "  CHATGPT_AUTHORIZATION=... [CHATGPT_COOKIE=...] codex-usage",
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
const parsed = parseArgs(argv);
const { cmd, flags } = parsed;

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

if (cmd === "status") {
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

process.stderr.write(`Unknown command: ${cmd}\n`);
process.stderr.write("Run: codex-usage --help\n");
process.exit(2);
