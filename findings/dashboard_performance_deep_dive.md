# Dashboard Performance Deep-Dive: Payload Bloat & Caching Risks

## 1. Objective

Investigate the technical implementation of dashboard data fetching and caching to verify reported performance issues, specifically "Payload Bloat" and "Offline Sync Accuracy."

### 🗄️ Caching Risks: Dexie (Local Browser Database)

In `frontend/src/hooks/useAnalyticsData.ts`:

- **The Code**: `await localDb.dashboardAnalytics.put({ id: currentBusiness.id, summary: result.data, updatedAt: Date.now() });`
- **The Issue**: The system caches the raw backend response in Dexie.
- **Sync Risk**: If a sale is deleted or updated on another device, the local Dexie cache remains stale until the 60-second hydration guard expires or a manual refresh is triggered.
- **Schema Drift**: Because the summary is saved as a raw object, if the backend changes its field names (e.g., from `receipt_number` to `receiptNumber`), the UI will display blank columns for any data loaded from the local cache until the cache is cleared or overwritten.

## 3. Recommended Optimization Strategy

### 🚀 Recommendation 1: Decouple Dashboard from Full Sales List

1.  **Refactor `useDashboardData`**: Remove the `useSalesData` call.
2.  **Unify Data**: Modify the UI to use the `recentSales` list provided by `useAnalyticsData` (the summary) instead of the list from `useDashboardData`.
3.  **Efficiency**: This reduces the dashboard's total data requirement by ~90%.

### 🚀 Recommendation 2: Enhanced Cache Invalidation

1.  **Versioned Cache**: Include a `schemaVersion` in the Dexie object. If the frontend code has a higher version than the cache, ignore the cache and force a fetch.
2.  **Smart Sync**: Trigger a `dashboardAnalytics` invalidation whenever a successful sale or deletion occurs locally.

## 4. Conclusion

The dashboard currently suffers from significant "over-fetching." By relying strictly on the consolidated analytics summary and removing the redundant 50-item sales list, we can achieve massive performance gains and reduce server egress costs.
