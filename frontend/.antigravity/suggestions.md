# Project Suggestions

## Inventory Module

1. **Component Refactoring**: 
   - `InventoryMainContent.tsx` controls multiple heavy tabs (Dashboard, Stock Count, Requisitions). Consider splitting these into separate routes or using `React.lazy` to load tabs only when active. This will improve initial render performance.

2. **Type Safety**:
   - Explicit `any` usage (e.g., `interface InventoryPageProps { initialRequisitions?: any[] }`) should be replaced with properly typed interfaces (e.g., `Requisition[]`).

3. **Code Organization**:
   - `StockCountTab.tsx` is very large (~1000 lines). Break it down into smaller components:
     - `StockAuditTable`
     - `StockCountHistory`
     - `QuickAdjustForm`
   - Move complex export logic (PDF/CSV generation) into dedicated hooks or utility functions to keep components clean.

4. **Error Handling**:
   - Standardize error handling in Server Actions. Currently, some actions return `{ success: false, error: string }` while others might throw. A consistent `Result<T>` pattern would be beneficial.

5. **Constants**:
   - Magic strings and regex patterns (e.g., matching "AUD-" in audit logs) should be extracted to a constants file to prevent typos and ease maintenance.
