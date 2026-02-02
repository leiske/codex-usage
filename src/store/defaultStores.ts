import type { Store } from "./Store";
import { fileStore } from "./fileStoreAdapter";
import { passStore } from "./passStore";
import { secretToolStore } from "./secretToolStore";

import type { FileStoreOptions } from "./fileStore";

export function getDefaultStores(fileOptions?: FileStoreOptions): Store[] {
  // Priority order.
  return [secretToolStore(), passStore(), fileStore(fileOptions ?? {})];
}
