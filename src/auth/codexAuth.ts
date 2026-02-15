export type CodexAuthEnv = Record<string, string | undefined>;

export type LoadCodexAuthOptions = {
  env?: CodexAuthEnv;
  authPath?: string;
};

export type CodexAuth = {
  authPath: string;
  authorization: string;
};

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getDefaultCodexAuthPath(env: CodexAuthEnv = Bun.env as CodexAuthEnv): string {
  const codexHome = env.CODEX_HOME?.trim();
  if (codexHome) return `${stripTrailingSlashes(codexHome)}/auth.json`;

  const home = env.HOME?.trim();
  if (!home) throw new Error("Cannot determine auth path (set CODEX_HOME or HOME)");
  return `${stripTrailingSlashes(home)}/.codex/auth.json`;
}

function getTokenFromCodexAuth(data: unknown): string | null {
  const v = data as {
    tokens?: {
      id_token?: unknown;
      access_token?: unknown;
    };
  };

  if (!v || typeof v !== "object") return null;
  if (!v.tokens || typeof v.tokens !== "object") return null;

  const idToken = typeof v.tokens.id_token === "string" ? v.tokens.id_token.trim() : "";
  if (idToken) return idToken;

  const accessToken = typeof v.tokens.access_token === "string" ? v.tokens.access_token.trim() : "";
  if (accessToken) return accessToken;

  return null;
}

export async function loadCodexAuth(options: LoadCodexAuthOptions = {}): Promise<CodexAuth> {
  const env = options.env ?? (Bun.env as CodexAuthEnv);
  const authPath = options.authPath ?? getDefaultCodexAuthPath(env);

  const file = Bun.file(authPath);
  if (!(await file.exists())) {
    throw new Error(`Missing auth to query usage. Expected Codex auth file: ${authPath}`);
  }

  const data = (await file.json()) as unknown;

  const token = getTokenFromCodexAuth(data);
  if (!token) {
    throw new Error(`Invalid Codex auth file at ${authPath}: missing tokens.id_token or tokens.access_token`);
  }

  return {
    authPath,
    authorization: `Bearer ${token}`,
  };
}
