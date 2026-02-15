# codex-usage

Unofficial Bun-only CLI that reads the same internal usage endpoint the ChatGPT web UI uses and prints two usage bars (5-hour + Weekly).

This can break at any time (internal endpoint / headers / Cloudflare). It never prints your raw cookies/tokens.

## Install

Requires Bun.

Run without installing:

```bash
bunx codex-usage --help
```

Or install globally:

```bash
bun add -g codex-usage
codex-usage --help
```

## Usage

```bash
# Fetch and print usage bars
codex-usage
```

Auth source:
- `CODEX_HOME/auth.json` when `CODEX_HOME` is set.
- `~/.codex/auth.json` when `CODEX_HOME` is not set.

Useful flags:
- `--verbose` (include reset timestamps)

## Publishing (maintainers)

```bash
bun publish
```
