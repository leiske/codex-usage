import { describe, expect, test } from "bun:test";

import { runStoredCommandWithErrors } from "../src/commands/runStored";

describe("runStoredCommandWithErrors (no auth)", () => {
  test("prints terse import instructions when no stored auth and env missing", async () => {
    const result = await runStoredCommandWithErrors({
      stores: [],
      env: {},
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Missing auth to query usage");
    expect(result.stderr).toContain("codex-usage import");
  });
});
