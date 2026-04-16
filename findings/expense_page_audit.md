# Expense Page Deep Audit Report

## 1. Architectural Flaws & Visibility Gaps

### [CRITICAL] Visibility Bypass (Client-Side Protection Only)
- **Issue**: The `canViewTotalExpenses` check from `useFinancialVisibility` is used to replace values with `•••` in the UI, but the raw numeric data is still fully available in the frontend `expenses` state and reachable via browser developer tools.
- **Impact**: Any user with `view` permission can see sensitive financial totals and individual amounts regardless of their role's "View Totals" permission.
- **Recommendation**: The backend `getExpensesAction` should zero out or omit amount fields if the user lacks the required permission.

### [PERFORMANCE] The "Hydration Storm" (Triple Loading)
- **Issue**: The `ExpensesPage` (SSR) fetches data, then `useExpenses` tries to load from Dexie (local cache), and finally React Query triggers a fresh fetch. This causes:
    1. Unnecessary database load.
    2. UI "flicker" as data is overwritten multiple times.
    3. Potential "Stale Overwrite" where newer SSR data is replaced by older Dexie data before the final fetch.
- **Recommendation**: Implement a `lastUpdated` check or use React Query's `initialData` correctly without the manual `useEffect` logic in `useExpenses`.

---

## 2. Heavy Frontend Logic (Logic Leakage)

### [HEAVY] Client-Side Analytics & Statistics
- **Location**: `useExpenseData.ts` and `ExpenseCategoriesSummary.tsx`.
- **Logic**: The frontend iterates over the entire `expenses` array to calculate:
    - `totalExpenses` (via `.reduce`)
    - `thisMonthExpenses` (via `.filter` and `.reduce`)
    - Category groupings (via `Map` and sorting)
    - Person-in-charge groupings
- **Impact**: As the business grows to thousands of expenses, the UI will lag or freeze during tab switching or date filtering.
- **Recommendation**: Move these calculations to the backend `getExpensesAction` or a dedicated `getExpenseStats` endpoint that returns pre-aggregated data.

### [HEAVY] Global Search & Filtering
- **Location**: `ExpensesList.tsx`.
- **Logic**: Filtering by description, category, and payment method is done in-memory via `.filter()`.
- **Impact**: Does not scale. Search results are limited only to what is currently loaded in the client (50 items by default), making it impossible to find older records unless the user scrolls and triggers more fetches (which isn't even implemented).
- **Recommendation**: Implement server-side search and filtering in `getExpensesAction`.

---

## 3. Data Integrity & Computation Risks

### [INTEGRITY] N+1 "Loop of Death" in Bulk Actions
- **Location**: `useExpenses.ts -> createBulkExpenses`.
- **Issue**: Bulk entry loops through the array and awaits `createExpenseAction` for every single item.
- **Impact**: Creating 50 expenses via CSV upload triggers 50 sequential network requests, 50 database transactions, and 50 cache invalidations. This is highly prone to timeouts and partial failures.
- **Recommendation**: Create a `createBulkExpensesAction` that performs a single batch insert on the backend.

### [HARDENING] Missing Math Guards in Updates
- **Location**: `finance.ts -> updateExpenseAction`.
- **Issue**: Unlike `createExpenseAction`, the `updateExpenseAction` and other payment actions do not use `toSafeNumber` before sending data to the backend or returning it.
- **Impact**: Risk of `NaN` or `None` string poisoning in the database if the frontend sends invalid input.

---

## 4. Inconsistencies & UX Flaws

### [UI] Date Formatting Inconsistency
- **Issue**: `ExpensesList.tsx` uses `toLocaleDateString("en-US")`, which might conflict with the user's localized settings or the business's preferred format.
- **Issue**: The `mounted` state check for date rendering (`mounted ? ... : "---"`) is a band-aid for hydration mismatch but creates a jarring visual jump on load.

### [LOGIC] Partial Linkage Logic
- **Issue**: The `updateExpenseAction` payload explicitly sets `linkToCash: !!updates.cashAccountId`.
- **Potential Flaw**: If a user wants to change the cash account but *not* update the linked transaction, the system might force a re-link or duplicate logic. The coupling between `Expense` and `CashTransaction` is fragile in the update path.

---

## Summary of Recommendations

| Category | Priority | Action |
| :--- | :--- | :--- |
| **Security** | High | Move Amount-level permission masking to the Backend. |
| **Performance** | High | Implement Backend Aggregation for stats and categories. |
| **Reliability** | Medium | Replace N+1 bulk loop with a single `BulkInsert` action. |
| **Optimization** | Medium | Streamline `useExpenses` to prevent triple-hydration. |
| **UX** | Low | Standardize date formatting and implement server-side search. |
