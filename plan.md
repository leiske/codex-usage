# Codex Usage CLI (Unofficial) - Implementation Plan

Goal: a Bun-only CLI (`codex-usage`) that imports a browser "Copy as cURL" request for `https://chatgpt.com/backend-api/wham/usage`, securely stores the auth material, fetches the JSON, and prints two usage bars matching the UI semantics:
- 5-hour window: `rate_limit.primary_window.used_percent`
- weekly window: `rate_limit.secondary_window.used_percent`

Constraints:
- Bun only (runtime + test runner). Avoid Node-specific APIs.
- Treat all auth material as secrets; never print raw cookies/tokens.
- Expect breakage (internal endpoint, header requirements, Cloudflare). Handle `401/403` by telling the user to re-import.

Tracer-bullet philosophy:
- Each phase produces a runnable, verifiable artifact.
- Testing starts immediately (unit tests + small integration tests + manual verification steps).
- Prefer thin vertical slices over big-bang completion.

## Phase 0 - Repo Bootstrap (Day 0)

Deliverables:
- `bun.lock`/`bun.lockb` + `package.json` (or Bun equivalent) with a single executable entrypoint.
- `src/` layout with a minimal CLI skeleton.
- `bun test` wired up.

Acceptance criteria:
- `bun test` runs and passes.
- `bun run ./src/cli.ts --help` (or `bun run codex-usage -- --help`) prints usage.

Verification:
- Add a trivial unit test (e.g., bar rendering with 0% and 100%).

## Phase 1 - Tracer Bullet: Fetch + Render Using Env Vars

Purpose:
- Prove the end-to-end fetch+render path works without any parsing/storage complexity.

Implementation:
- Implement `src/fetchUsage.ts` that calls the endpoint using:
  - `CHATGPT_WHAM_URL` (default to `https://chatgpt.com/backend-api/wham/usage`)
  - `CHATGPT_AUTHORIZATION` (e.g. `Bearer ...`)
  - `CHATGPT_COOKIE` (optional; string)
- Implement `src/renderBars.ts` that takes the parsed JSON and prints two bars.

CLI:
- `codex-usage run` uses env vars and prints bars.

Acceptance criteria:
- With valid env vars, `codex-usage run` prints:
  - two labeled bars
  - percent values from the response
  - human-readable reset times using `reset_after_seconds`
- With missing required env vars, prints actionable error.
- With `401/403`, prints "auth expired; run import again".

Tests:
- Unit tests for:
  - bar width math
  - percent clamping
  - duration formatting (e.g. 620s -> 10m 20s)
- Integration test with mocked fetch (do not hit network):
  - feed sample JSON and verify output contains expected percents.

Manual verification:
- Temporarily set env vars from a known-good cURL and run `codex-usage run`.

## Phase 2 - cURL Import (Parser) + Minimal Persistence (Unsafe File)

Purpose:
- Make the tool usable without env vars, but keep persistence deliberately simple first.

Implementation:
- `src/curl/parseCurl.ts` parses "Copy as cURL" input into:
  - `url`
  - headers map (case-insensitive normalization)
  - cookie string (prefer `-b/--cookie`, else `Cookie:` header)
- Keep a narrow allowlist of headers to store/send:
  - `authorization`
  - `user-agent`
  - `accept`
  - `referer`
  - `oai-device-id`
  - `oai-client-version`
  - `oai-client-build-number`
  - plus `cookie` (from `-b`)

CLI:
- `codex-usage import` reads stdin and writes `~/.config/codex-usage/auth.json` with `0600` perms.
- `codex-usage` (default) loads this file and runs.

Acceptance criteria:
- `codex-usage import < curl.txt` succeeds and stores a normalized JSON blob.
- `codex-usage` fetches and prints bars using stored data.
- Secrets are never echoed; logging is redacted.

Tests:
- Unit tests for parser:
  - single-quoted headers
  - double-quoted headers
  - line continuations with `\`
  - both `-b` and `-H 'cookie: ...'` variants
  - ignores unrelated flags
- Snapshot tests: parser output is stable and contains expected keys.

Manual verification:
- Paste a real cURL into `curl.txt`, run import, then run default command.

Security note:
- This phase is intentionally "unsafe" storage as a stepping stone. Add loud warnings in output/docs.

## Phase 3 - Secure Storage Backend(s)

Purpose:
- Replace unsafe file storage with OS keychain where available.

Backends (priority order):
1) Secret Service via `secret-tool` (package: `libsecret-tools`)
2) `pass` (if configured)
3) File fallback (opt-in or automatic only when others missing)

Implementation:
- `src/store/Store.ts` interface:
  - `get(): Promise<AuthBlob | null>`
  - `set(blob: AuthBlob): Promise<void>`
  - `clear(): Promise<void>`
- `src/store/secretToolStore.ts` uses `Bun.spawn` to run:
  - `secret-tool store --label=... service codex-usage account default`
  - `secret-tool lookup service codex-usage account default`
  - `secret-tool clear service codex-usage account default` (or equivalent)
- `src/store/passStore.ts` uses `pass` entry `codex-usage/default`.
- `src/store/fileStore.ts` remains as fallback.

CLI:
- `codex-usage import` stores via best available backend.
- `codex-usage store status` prints which backend is active (no secrets).
- `codex-usage logout` clears stored secret.

Acceptance criteria:
- On a machine with `secret-tool`, `import` uses it.
- If `secret-tool` absent but `pass` present, uses `pass`.
- If neither is available, uses file storage and prints a warning.

Tests:
- Unit tests for backend selection logic.
- "Fake store" test double for end-to-end CLI without touching real keychains.

Manual verification:
- openSUSE: install `libsecret-tools`, run import, confirm `secret-tool lookup ...` returns a value.
- WSL Ubuntu: if Secret Service unavailable, verify fallback to `pass` or file.

## Phase 4 - Harden Fetch + Error UX

Purpose:
- Make runtime behavior predictable and safe.

Implementation:
- Timeouts + retry policy:
  - 1 fast attempt, no retries by default.
  - Optional `--retry 2` for flaky 5xx.
- `401/403`:
  - print a single-line instruction: "Auth expired. Re-run: codex-usage import"
  - optionally offer `--debug` to show status code and which headers were sent (names only).
- Redaction:
  - any debug printing must redact `cookie`, `authorization`.

Acceptance criteria:
- Clear messages for:
  - missing stored auth
  - expired auth
  - unexpected JSON shape

Tests:
- Mock fetch returning 403 -> expected message.
- Mock fetch returning malformed JSON -> expected message.

## Phase 5 - Output Polish (Bars Match UI Semantics)

Purpose:
- Match what users care about: percent + reset times.

Implementation:
- Two fixed-width bars (default width 24).
- Labels:
  - `5-hour`
  - `Weekly`
- Include:
  - `used_percent` (as integer percent)
  - `reset_in` as `Xh Ym` or `Xd Xh` depending on magnitude
  - optional `reset_at` as unix -> local timestamp behind `--verbose`

Acceptance criteria:
- Output stable across runs.
- Works in narrow terminals (<= 80 cols): degrade gracefully (shorter bar).

Tests:
- Snapshot tests for default formatting.

## Phase 6 - Packaging + Docs

Purpose:
- Make it installable and safe to use.

Implementation:
- `README.md`:
  - what it does / does not do
  - security warnings
  - how to import cURL from DevTools
  - how to refresh when 403
- `plan.md` (this file) stays as living document.

Acceptance criteria:
- Fresh machine instructions are complete.

## Phase 7 - Optional Enhancements (After MVP)

Ideas:
- `--watch 60` refresh mode.
- `--json` output for scripting.
- Support importing a raw cookie string as a convenience (still manual).
- Add detection for `code_review_rate_limit` and display as a third bar behind `--all`.

Non-goals:
- Browser cookie DB extraction/decryption.
- Any guarantee of stability (internal endpoint can change).

## Data Model (AuthBlob)

Store exactly what is needed to replay the request:

```json
{
  "url": "https://chatgpt.com/backend-api/wham/usage",
  "headers": {
    "authorization": "Bearer ...",
    "user-agent": "...",
    "accept": "*/*",
    "referer": "https://chatgpt.com/codex/settings/usage",
    "oai-device-id": "...",
    "oai-client-version": "...",
    "oai-client-build-number": "..."
  },
  "cookie": "name=value; ...",
  "imported_at": 1770000000
}
```

## MVP Acceptance Test (End-to-End)

1) User copies the request as cURL from DevTools.
2) `cat curl.txt | codex-usage import`
3) `codex-usage`
4) Output contains both bars with correct percents and reset times.
5) After invalidating session, `codex-usage` shows a single-line re-import instruction.
