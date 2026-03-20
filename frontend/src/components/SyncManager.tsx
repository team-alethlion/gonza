"use client";

import { useProductSync } from "@/hooks/useProductSync";
import { useOfflineSync } from "@/hooks/useOfflineSync";

export function SyncManager() {
  // These hooks run in the background to keep Dexie in sync
  useProductSync();
  useOfflineSync();
  
  return null; 
}
