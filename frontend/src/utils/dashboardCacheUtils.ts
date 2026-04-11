import { localDb } from "@/lib/dexie";

/**
 * 🛡️ SMART SYNC HELPER
 * Clears the cached dashboard analytics for a specific branch.
 * This should be called whenever a sale is created, updated, or deleted
 * to ensure the dashboard shows fresh aggregates on the next mount.
 */
export const invalidateDashboardCache = async (branchId: string | undefined) => {
  if (!branchId) return;
  
  try {
    console.log(`[Cache] Invalidating dashboard analytics for branch: ${branchId}`);
    await localDb.dashboardAnalytics.delete(branchId);
  } catch (err) {
    console.warn("[Cache] Failed to invalidate dashboard cache:", err);
  }
};
