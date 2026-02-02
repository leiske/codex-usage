import type { AuthBlob } from "../auth/AuthBlob";
import type { Store } from "./Store";
import {
  fileStoreClear,
  fileStoreGet,
  fileStoreSet,
  getDefaultAuthPath,
  type FileStoreOptions,
} from "./fileStore";

export function fileStore(options: FileStoreOptions = {}): Store {
  const authPath = options.authPath ?? getDefaultAuthPath(options.env ?? (Bun.env as any));
  return {
    kind: "file",
    label: `file (${authPath})`,
    async isAvailable(): Promise<boolean> {
      return true;
    },
    async get(): Promise<AuthBlob | null> {
      return fileStoreGet(options);
    },
    async set(blob: AuthBlob): Promise<void> {
      return fileStoreSet(blob, options);
    },
    async clear(): Promise<void> {
      return fileStoreClear(options);
    },
  };
}
