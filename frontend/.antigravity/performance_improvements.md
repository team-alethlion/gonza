# Performance & Architecture Improvements Notes

## 1. Network Data Over-Fetching (FIXED)
**Location:** `src/app/actions/products.ts`, `src/app/actions/analytics.ts`, `src/app/actions/sales.ts`
- **Issue:** The server was fetching all records just to filter or aggregate in memory.
- **Fixes Applied:**
  - `getProductsAction`: Now uses native Prisma field-to-field comparison for `lowStock`.
  - `getGlobalInventoryStatsAction` & `getProductStatsAction`: Now use optimized `$queryRaw` SQL queries.
  - `getTotalExpensesAction` & `getPeriodSalesAction`: Now use Prisma's `aggregate` function.

## 2. Memory Exhaustion / Barcode Scanner (FIXED)
**Location:** `src/components/SalesForm.tsx`, `src/components/ProductSaleItemInput.tsx`, `src/lib/dexie.ts`
- **Issue:** Full inventory was loaded into client RAM for scanner and search lookups.
- **Fix Applied:** 
  - Integrated **Dexie.js** for persistent IndexedDB storage.
  - Implemented **Delta Sync** mechanism to fetch only recently updated products.
  - Barcode scanner and product search now query the local database for O(1) instant results.

## 3. O(N) Financial Balance Calculations (FIXED)
**Location:** `src/app/actions/finance.ts` -> `getCashAccountBalanceAction`
- **Issue:** The server was fetching and summing every transaction in history in memory.
- **Fix Applied:** Refactored to use Prisma's `groupBy` and `_sum` to calculate balances directly in the database.

## 4. Heavy Analytics & Filtering on Client (FIXED)
**Location:** `src/hooks/useAnalyticsData.ts`, `src/hooks/useSalesData.ts`, `src/hooks/useCustomers.ts`, `src/app/actions/customers.ts`
- **Issue:** Hooks were performing O(N * M) operations on the client to calculate summaries and lifetime stats.
- **Fix Applied:** 
  - Implemented `getAnalyticsSummaryAction` for server-side dashboard statistics.
  - Refactored `useAnalyticsData` to use the server action.
  - Refactored `getCustomersAction` to include `lifetimeValue` and `orderCount` using SQL aggregation.
  - Removed massive client-side sales fetching on the Customers page.

## 5. N+2 Query Explosion in Reports (FIXED)
**Location:** `src/app/actions/inventory.ts` -> `getStockSummaryReportAction`
- **Issue:** Triggered hundreds of DB queries in a loop for a single report.
- **Fix Applied:** Refactored to a single optimized SQL query using CTEs and `DISTINCT ON` to calculate all metrics at once.

## 6. Inefficient O(N) Lookups in Render Loops (FIXED)
**Location:** `src/components/SalesTable.tsx` -> `getCashAccountName`
- **Issue:** O(N²) lookup complexity in the sales table rows.
- **Fix Applied:** Implemented memoized `Map` lookups for O(1) performance during row rendering.

## 7. O(P * H) Complexity in Stock Reconciliation (FIXED)
**Location:** `src/app/actions/inventory.ts` -> `getStockRepairsPreviewAction`
- **Issue:** Loops through every product and its entire history to find broken chains in memory.
- **Fix Applied:** Implemented a single SQL query using CTEs, `LAG()` window function, and `DISTINCT ON` to detect all discrepancies across the entire branch inventory in one pass.

## 8. Redundant Calculations in Components (FIXED)
**Location:** `src/components/SalesTable.tsx`, `src/components/sales/SalesTableRow.tsx`
- **Issue:** Financial totals were recalculated from JSON items on every render.
- **Fix Applied:** Added `subtotal`, `total`, `totalCost`, `profit`, `discount`, and `taxAmount` to the `Sale` model and mapped them in the API. UI components now use these pre-calculated fields directly.

## 9. Lack of Proper Pagination in Contexts/Hooks (PARTIALLY FIXED)
**Location:** `useSalesData.ts`, `useCashTransactions.ts`, `useCustomers.ts`, `getCustomersAction`, `getCashTransactionsAction`
- **Issue:** Many views were fetching "all" records, leading to slow loads.
- **Fix Applied:** 
  - Implemented server-side `skip`/`take` for `getCustomersAction` and `getCashTransactionsAction`.
  - Updated `useCustomers` and `useCashTransactions` hooks to manage page state and fetch only the active page.
  - Dashboard now limits sales fetch to the most recent 50.

## 10. Global LocalStorage Keys (FIXED)
**Location:** `BusinessContext.tsx`
- **Issue:** `currentBusinessId` was not keyed by `userId`.
- **Fix Applied:** Refactored to use user-specific keys (`selected_business_${userId}`), ensuring correct data isolation on shared devices.

## 11. Offline-First & Local Storage Integration (FIXED)
**Location:** `src/lib/dexie.ts`, `src/hooks/useOfflineSync.ts`, `src/components/SyncManager.tsx`, `src/components/SalesForm.tsx`
- **Issue:** Spotty internet caused data loss and prevented sales from being saved.
- **Fix Applied:** 
  - Integrated **Dexie.js** for local persistent storage.
  - Implemented an **Offline Sync Queue** that automatically captures sales made while offline.
  - Added a **Background Sync Manager** that detects when the connection returns and pushes queued sales to the server.
  - Barcode scanner and product search now work entirely offline using local data.
