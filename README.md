# codex-usage

To install dependencies:

```bash
bun install
```

To run (Phase 2):

```bash
cat curl.txt | bun run ./src/cli.ts import
bun run ./src/cli.ts
```

Security note: Phase 2 stores auth unencrypted at `~/.config/codex-usage/auth.json` (chmod 600). Treat it like a password.

This project was created using `bun init` in bun v1.3.4. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
