import type { AuthBlob } from "../auth/AuthBlob";
import { isAuthBlob } from "../auth/AuthBlob";

export type FileStoreOptions = {
  env?: Record<string, string | undefined>;
  authPath?: string;
};

function getConfigDir(env: Record<string, string | undefined>): string {
  const xdg = env.XDG_CONFIG_HOME;
  if (xdg && xdg.trim() !== "") return xdg.replace(/\/+$/, "");
  const home = env.HOME;
  if (!home || home.trim() === "") throw new Error("Cannot determine config dir (HOME is not set)");
  return `${home.replace(/\/+$/, "")}/.config`;
}

export function getDefaultAuthPath(env: Record<string, string | undefined> = Bun.env): string {
  const base = getConfigDir(env);
  return `${base}/codex-usage/auth.json`;
}

function dirname(path: string): string {
  const idx = path.lastIndexOf("/");
  if (idx <= 0) return "/";
  return path.slice(0, idx);
}

async function mkdirp(dir: string): Promise<void> {
  const proc = Bun.spawn(["mkdir", "-p", dir], { stdout: "ignore", stderr: "ignore" });
  const code = await proc.exited;
  if (code !== 0) throw new Error(`Failed to create config dir: ${dir}`);
}

async function chmod600(path: string): Promise<void> {
  const proc = Bun.spawn(["chmod", "600", path], { stdout: "ignore", stderr: "ignore" });
  const code = await proc.exited;
  if (code !== 0) throw new Error(`Failed to chmod 600: ${path}`);
}

export async function fileStoreGet(options: FileStoreOptions = {}): Promise<AuthBlob | null> {
  const env = options.env ?? (Bun.env as Record<string, string | undefined>);
  const authPath = options.authPath ?? getDefaultAuthPath(env);

  const file = Bun.file(authPath);
  if (!(await file.exists())) return null;

  const data = await file.json();
  if (!isAuthBlob(data)) throw new Error("Stored auth file has unexpected shape");
  return data;
}

export async function fileStoreSet(blob: AuthBlob, options: FileStoreOptions = {}): Promise<void> {
  const env = options.env ?? (Bun.env as Record<string, string | undefined>);
  const authPath = options.authPath ?? getDefaultAuthPath(env);
  await mkdirp(dirname(authPath));

  const json = JSON.stringify(blob, null, 2) + "\n";
  await Bun.write(authPath, json);
  await chmod600(authPath);
}
