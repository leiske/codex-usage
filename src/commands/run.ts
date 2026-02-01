import { AuthExpiredError, MissingEnvError } from "../errors";
import { fetchUsage, type FetchFn } from "../fetchUsage";
import { renderBars } from "../renderBars";

export type RunResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type RunOptions = {
  env?: Record<string, string | undefined>;
  fetchFn?: FetchFn;
  barWidth?: number;
};

export async function runCommand(options: RunOptions = {}): Promise<RunResult> {
  const env = options.env ?? (Bun.env as Record<string, string | undefined>);
  const url = env.CHATGPT_WHAM_URL ?? "https://chatgpt.com/backend-api/wham/usage";

  const missing: string[] = [];
  const cookie = env.CHATGPT_COOKIE;
  const authorization = env.CHATGPT_AUTHORIZATION;
  if (!authorization) missing.push("CHATGPT_AUTHORIZATION");
  if (missing.length > 0) throw new MissingEnvError(missing);

  const json = await fetchUsage({
    url,
    cookie,
    authorization: authorization!,
    fetchFn: options.fetchFn,
  });

  const out = renderBars(json, { width: options.barWidth ?? 24 });
  return { exitCode: 0, stdout: `${out}\n`, stderr: "" };
}

export async function runCommandWithErrors(options: RunOptions = {}): Promise<RunResult> {
  try {
    return await runCommand(options);
  } catch (err) {
    if (err instanceof MissingEnvError) {
      return {
        exitCode: 1,
        stdout: "",
        stderr:
          "Missing env vars. Set these from a DevTools 'Copy as cURL' request:\n" +
          `  ${err.missing.join("\n  ")}\n`,
      };
    }

    if (err instanceof AuthExpiredError) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: "Auth expired. Re-run: codex-usage import\n",
      };
    }

    const msg = err instanceof Error ? err.message : String(err);
    return { exitCode: 1, stdout: "", stderr: `Failed to fetch usage: ${msg}\n` };
  }
}
