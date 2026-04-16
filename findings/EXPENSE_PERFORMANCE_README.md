# Expense Page Performance Investigation Findings

## 1. Identified Bottlenecks

### [CRITICAL] UI Blocking (The "Stats Trap")
- **Issue**: `ExpensesClient.tsx` uses a single `isLoading` flag that includes `isStatsLoading`.
- **Impact**: Even though the expense list is prefetched via SSR and available immediately, the user sees a loading spinner for 1-2 seconds while waiting for the `stats/` API call to finish. 
- **Recommendation**: Decouple the list rendering from the stats loading. Show the list immediately and use skeletons only for the stats cards.

### [PERFORMANCE] Lack of SSR for Stats
- **Issue**: The `page.tsx` only prefetches the raw expenses list. It does not prefetch the aggregated statistics.
- **Impact**: Mandatory client-side network request on every page load/refresh.
- **Recommendation**: Prefetch stats in `page.tsx` and pass them as `initialStats`.

### [REDUNDANCY] State Mirroring in `useExpenses`
- **Issue**: The hook maintains a local `expenses` state (`useState`) and syncs it via `useEffect` with React Query's `data`.
- **Impact**: Double re-renders on every data change. React Query already manages the "truth" of the data.
- **Recommendation**: Remove the `expenses` state and return `queriedExpenses` directly.

### [BACKEND] Non-Atomic Aggregations
- **Issue**: `get_expense_stats` in `logic/expenses.py` runs 3-4 separate database queries (Total, Monthly, Category Distribution, Person Distribution).
- **Impact**: Increased database overhead and longer response times.
- **Recommendation**: Combine as many aggregations as possible or ensure fields like `category` and `person_in_charge` are indexed.

---

## 2. Redundant Request Analysis

- **The Sync Loop**: `ExpensesClient.tsx` has a `useEffect` that calls `setFilters({})` on mount. 
- **The React Query behavior**: Since the initial state was also `{}`, the stringified key `"{}"` doesn't change, so React Query doesn't trigger a refetch *if* `initialData` is valid.
- **Verification**: However, if any property in `customDateRange` is `undefined`, `JSON.stringify` might produce different results if not handled carefully, leading to a redundant fetch on mount.

---

## 3. Conflicting Logic

- **Dexie vs SSR**: The fallback logic in `useExpenses.ts` to load from Dexie if `initialData` is missing is good, but it should be carefully guarded to ensure it doesn't overwrite fresh data with older cached data.

---

## 4. Implementation Plan

1. **Frontend**: Update `ExpensesClient.tsx` to not block the page on `isStatsLoading`.
2. **Frontend**: Use Skeletons in `ExpenseStatsCards` and `ExpenseCategoriesSummary` while stats are loading.
3. **Frontend**: Update `page.tsx` to prefetch stats.
4. **Frontend**: Clean up redundant state in `useExpenses.ts`.
5. **Backend**: Add indexes to `category` and `person_in_charge` in `Expense` model.
