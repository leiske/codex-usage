import { describe, expect, test } from "bun:test";

import { importCommandWithErrors } from "../src/commands/import";
import { runStoredCommandWithErrors } from "../src/commands/runStored";
import { fileStore } from "../src/store/fileStoreAdapter";

function tempAuthPath(): string {
  const id = crypto.randomUUID();
  const tmp = Bun.env.TMPDIR && Bun.env.TMPDIR.trim() !== "" ? Bun.env.TMPDIR : "/tmp";
  return `${tmp}/codex-usage-test-${id}/auth.json`;
}

describe("import + default run", () => {
  test("import stores allowlisted headers and default run uses them", async () => {
    const authPath = tempAuthPath();

    const curl =
      "curl 'https://example.test/backend-api/wham/usage' " +
      "-H 'accept: */*' " +
      "-H 'authorization: Bearer secret_token_value' " +
      "-H 'user-agent: UA' " +
      "-H 'x-unrelated: should-not-store'";

    const imp = await importCommandWithErrors({
      input: curl,
      file: { authPath },
      stores: [fileStore({ authPath })],
    });

    expect(imp.exitCode).toBe(0);
    expect(imp.stderr).toContain("WARNING");
    expect(imp.stdout).toContain("Imported auth");
    expect(imp.stdout).toContain("authorization");
    expect(imp.stdout).toContain("user-agent");
    expect(imp.stdout).not.toContain("secret_token_value");

    const fetchFn = async (input: any, init?: any) => {
      const headers = init?.headers as Record<string, string> | undefined;
      expect(headers?.authorization).toBe("Bearer secret_token_value");
      expect(headers?.["user-agent"]).toBe("UA");
      expect(headers?.["x-unrelated"]).toBeUndefined();
      return new Response(
        JSON.stringify({
          rate_limit: {
            primary_window: { used_percent: 10, reset_after_seconds: 60 },
            secondary_window: { used_percent: 20, reset_after_seconds: 120 },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    const run = await runStoredCommandWithErrors({
      fetchFn: fetchFn as any,
      barWidth: 10,
      stores: [fileStore({ authPath })],
    });

    expect(run.exitCode).toBe(0);
    expect(run.stderr).toBe("");
    expect(run.stdout).toContain("5-hour");
    expect(run.stdout).toContain("Weekly");
    expect(run.stdout).not.toContain("secret_token_value");
  });
});
