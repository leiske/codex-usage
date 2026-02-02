import type { AuthBlob } from "../auth/AuthBlob";

export type StoreKind = "secret-tool" | "pass" | "file";

export type Store = {
  kind: StoreKind;
  label: string;
  isAvailable(): Promise<boolean>;
  get(): Promise<AuthBlob | null>;
  set(blob: AuthBlob): Promise<void>;
  clear(): Promise<void>;
};
