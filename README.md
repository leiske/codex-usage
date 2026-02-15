# codex-usage

Unofficial CLI to report codex usage limits.

This can break at any time since it uses an internal API.

## Usage

```bash
# Fetch and print usage bars
> codex-usage

5-hour [#-----------------------] 3% (resets in 3h 56m)
Weekly [#-----------------------] 6% (resets in 3d 8h)
```

Auth source:
- `CODEX_HOME/auth.json` when `CODEX_HOME` is set.
- `~/.codex/auth.json` when `CODEX_HOME` is not set.

## Install

Run without installing:

```bash
bunx codex-usage --help
```

Or install globally:

```bash
bun add -g codex-usage
codex-usage --help
```

## Publishing (maintainers)

```bash
bun publish
```
