# Implementation Plan: Expense Visibility Bypass & Performance Fix

## 1. Backend: Permission-Based Masking & Bulk Actions

### Phase 1: User Model Hardening
- **File**: `backend/users/models.py`
- **Action**: Add `has_permission(perm_name: str)` method to the `User` class.
- **Logic**: 
    - Always return `True` for `is_superuser` or roles: `admin`, `manager`, `superadmin`, `owner`.
    - Otherwise, check if a `Permission` with `name=perm_name` is linked to the user's `role`.

### Phase 2: Serializer Masking
- **File**: `backend/finance/serializers.py`
- **Action**: Update `ExpenseSerializer` to override `to_representation`.
- **Logic**: 
    - Check if the request user has `dashboard.view_total_expenses` permission.
    - If not, set `amount` to `0` or mask it (e.g., `-1` or `null`). 
    - *Decision*: Masking as `null` is safest for frontend types.

### Phase 3: Performance & Integrity Actions
- **File**: `backend/finance/views.py`
- **Action 1**: Add `@action(detail=False, methods=['post']) def bulk_create`.
    - Handles multiple expenses in one atomic transaction.
- **Action 2**: Add `@action(detail=False, methods=['get']) def stats`.
    - Returns `total_expenses`, `this_month_expenses`, and `category_distribution`.
    - Ensures stats are also masked based on permissions.

---

## 2. Frontend: Adapter & State Management

### Phase 4: Server Action Masking Support
- **File**: `frontend/src/app/actions/finance.ts`
- **Action**: Update `getExpensesAction` to handle potential `null` or masked amounts from the backend.
- **Action**: Update `toSafeNumber` to handle database-level masking.

### Phase 5: Hook Refactoring
- **File**: `frontend/src/hooks/useExpenses.ts`
- **Action**: Update `loadExpenses` to also fetch from the new `stats` endpoint.
- **Action**: Optimize `createBulkExpenses` to use the new `bulk_create` endpoint.
- **Action**: Remove redundant Dexie loading if SSR data is present and fresh.

### Phase 6: Analytics Logic Migration
- **File**: `frontend/src/hooks/useExpenseData.ts`
- **Action**: Remove client-side `.reduce` and `.filter` for global stats.
- **Action**: Feed data from the backend `stats` endpoint directly into `expenseStats`.

---

## 3. Security & Validation

- **Verification**: Login as a "Staff" user without "View Totals" permission.
- **Verification**: Inspect Network tab `GET /api/finance/expenses/`.
- **Expected**: `amount` field should be `null` or `0` in the JSON response, not just masked by CSS in the UI.
- **Verification**: Inspect `GET /api/finance/expenses/stats/`.
- **Expected**: Totals should be `0` or `null` for restricted users.
