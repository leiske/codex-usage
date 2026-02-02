# codex-usage

To install dependencies:

```bash
bun install
```

To run (Phase 2/3):

```bash
cat curl.txt | bun run ./src/cli.ts import
bun run ./src/cli.ts
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

This project was created using `bun init` in bun v1.3.4. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
