# Research: Sales Page Render Latency (3.5s)

## 1. Problem Identification
The logs indicate that a `GET /agency/sales` request takes 3.6 seconds, with **3.5 seconds** spent entirely on the `render` phase.

```log
GET /agency/sales 200 in 3.6s (compile: 67ms, proxy.ts: 68ms, render: 3.5s)
```

## 2. Root Cause Analysis (Deep Dive)

### A. Redundant Hook Instantiation (The N+1 Hook Anti-Pattern)
In `frontend/src/components/sales/SalesTableRow.tsx`, the following hooks are called for every single row in the table:
- `useCashAccounts()`
- `useCashTransactions()`
- `useIsMobile()`
- `useProfiles()`
- `useFinancialVisibility()`

**Deep Evidence**: Analysis of `useFinancialVisibility.ts` reveals it accesses `ProfileContext` and performs string matching for over 10 different permissions (e.g., `hasPermission("inventory", "view_cost_price")`). When rendering 50 sales rows, this results in **500+ permission evaluations** blocking the main thread during a single render cycle. Furthermore, `useCashAccounts` and `useCashTransactions` instantiate TanStack Query observers for every row.

### B. Inefficient Data Mapping ($O(N \times M)$)
Each `SalesTableRow` executes `getCashAccountName()` during render. 
**Deep Evidence**: This function performs two `.find()` operations per row:
1. `transactions.find(t => t.id === sale.cashTransactionId)`
2. `accounts.find(a => a.id === linkedTransaction.accountId)`
For 50 sales and 100 transactions, this results in 5,000 loop iterations during the synchronous render phase.

### C. Logging Overhead
The `getCashAccountName()` function contains 7 separate `console.log` statements per row. At 50 rows, this generates **350 log entries** per render, causing significant I/O blocking in the browser console.

## 3. Recommended Optimization Strategy & Implementation

### Phase 1: Context Hoisting
1. **Hoist Hooks**: Call `useFinancialVisibility()` exactly **once** inside the parent `SalesTable.tsx`.
2. **Prop Drilling**: Pass an object containing the resolved visibility flags down to `SalesTableRow`.
```typescript
// SalesTable.tsx
const visibilityFlags = useFinancialVisibility();
<SalesTableRow visibilityFlags={visibilityFlags} ... />
```

### Phase 2: O(1) Data Resolution
1. **Memoized Maps**: `SalesTable.tsx` already defines `transactionMap` and `accountMap`.
2. **Pre-calculation**: Pass the resolved string directly to the row to eliminate all `.find()` calls.
```typescript
// SalesTable.tsx
const cashAccountName = getCashAccountName(sale); // Uses O(1) Map.get()
<SalesTableRow cashAccountName={cashAccountName} ... />
```

### Phase 3: Pure Component
1. Remove all context hooks from `SalesTableRow`.
2. Wrap `SalesTableRow` in `React.memo` to ensure it only re-renders when its specific `sale` object or `visibilityFlags` change.
