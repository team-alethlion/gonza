# Sales Page Audit Findings

## 1. Hydration & UX Flaws

### ✅ Fixed: Hydration Mismatch in Sales Filters
- **The Issue:** The hook was initializing state from `localStorage` immediately, causing server/client mismatches.
- **Resolution:** Refactored `useSalesFilters.ts` to use server-safe defaults and load from `localStorage` only after hydration via `useEffect`.

### ✅ Fixed: Mobile Optimization Support
- **The Issue:** The `SalesDataTable` was hardcoding `mobileOptimized={false}`, forcing a horizontal table on mobile devices.
- **Resolution:** Enabled dynamic mobile optimization by using `useIsMobile()` in `SalesDataTable.tsx`. Also updated `SalesTable.tsx` to ensure the layout correctly respects the `mobileOptimized` prop.

---

## 2. Performance & Data Fetching

### 📡 Payload Bloat: Excessive Item Data
**Location:** `getSalesAction` in `frontend/src/app/actions/sales.ts`
**The Issue:** Every request for the sales list returns the full `items` array for every single sale.
**The Impact:** If a user has 50 sales, and each sale has 10 items, the browser downloads 500 item objects just to show a list where items are usually truncated.
**Recommendation:** The backend should provide a "lightweight" list endpoint that returns a pre-computed `item_summary` string and `total_quantity` instead of the raw items array for the list view.

### 🔄 Redundant SSR Mapping
**Location:** `frontend/src/app/(agency)/agency/sales/page.tsx`
**The Issue:** The server-side page manually maps over 20 fields for each sale object instead of using the central `mapDbSaleToSale` utility.
**The Impact:** This creates a maintenance nightmare. If a field name changes in the database, it must be updated in two places (the utility and this page). It also leads to logic drift (e.g., how `amount_due` vs `balance_due` is handled).
**Recommendation:** Refactor the SSR loop to use `mapDbSaleToSale` directly.

---

## 3. Data Integrity & Logic Drift

### 💸 Status String Mapping
**Location:** `upsertSaleAction` in `frontend/src/app/actions/sales.ts`
**The Issue:** The frontend manually converts human-readable statuses (e.g., "NOT PAID") into backend enums (e.g., "UNPAID").
**The Risk:** If the backend changes its enum values, the frontend will start sending invalid data, potentially breaking the database state.
**Recommendation:** The backend should handle status normalization, or the frontend should use a shared Enum definition.

---

## 4. Summary of Risks
1. **Hydration Errors**: Frequent console errors and flickering UI on load.
2. **Mobile Usability**: Poor experience for users managing sales on the go.
3. **Bandwidth Waste**: Large JSON payloads slowing down the "Sales" tab for high-volume businesses.
4. **Logic Inconsistency**: SSR mapping vs Client-side mapping drift.
