#!/usr/bin/env bun

import { importCommandWithErrors } from "./commands/import";
import { runStoredCommandWithErrors } from "./commands/runStored";
import { storeStatusCommandWithErrors } from "./commands/storeStatus";
import { logoutCommandWithErrors } from "./commands/logout";
import { parseCliFlags } from "./cliFlags";

function helpText(): string {
  return [
    "codex-usage - ChatGPT usage",
    "",
    "Usage:",
    "  codex-usage --help",
    "  codex-usage --version",
    "  codex-usage                 # see usage",
    "  codex-usage import          # read cURL from stdin and store auth",
    "  codex-usage status          # show active auth storage",
    "  codex-usage logout          # clear stored auth",
    "",
    "Flags:",
    "  --retry N     retry on HTTP 5xx (default 0)",
    "  --debug       show status + header names on errors",
    "  --verbose     include reset timestamps",
    "",
    "Examples:",
    "  cat curl.txt | codex-usage import",
    "  pbpaste | codex-usage import # macOS",
    "  xclip -o | codex-usage import  # Linux",
    "  codex-usage",
    "  CHATGPT_AUTHORIZATION=... [CHATGPT_COOKIE=...] codex-usage",
  ].join("\n");
}

const argv = Bun.argv.slice(2);
let parsed: ReturnType<typeof parseCliFlags>;
try {
  parsed = parseCliFlags(argv);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Invalid args: ${msg}\n`);
  process.stderr.write("Run: codex-usage --help\n");
  process.exit(2);
}

const { flags, positionals } = parsed;
const cmd = positionals[0] ?? null;

if (flags.version) {
  const pkg = (await Bun.file(new URL("../package.json", import.meta.url)).json()) as {
    version?: string;
  };
  process.stdout.write(`${pkg.version ?? "0.0.0"}\n`);
  process.exit(0);
}

if (flags.help) {
  process.stdout.write(helpText());
  process.stdout.write("\n");
  process.exit(0);
}

if (cmd === null) {
  const result = await runStoredCommandWithErrors({
    retry: flags.retry,
    debug: flags.debug,
    verbose: flags.verbose,
  });
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
