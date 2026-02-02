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
# 1) In your browser DevTools Network tab, find the wham/usage request
# 2) "Copy as cURL" and save it to curl.txt
cat curl.txt | codex-usage import

# Fetch and print usage bars
codex-usage
```

Storage:
- Phase 3 will prefer OS keychain (`secret-tool`), then `pass`, then an unencrypted file fallback.
- File fallback path: `~/.config/codex-usage/auth.json` (chmod 600).

Useful commands:
- `codex-usage status`
- `codex-usage logout`

Useful flags:
- `--retry N` (retry on HTTP 5xx)
- `--debug` (print status + header names on errors)
- `--verbose` (include reset timestamps)

## Publishing (maintainers)

```bash
bun publish
```
