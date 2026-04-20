# Implementation Plan: Installment Payment System Refinement

## 1. Objective
Consolidate installment payment logic into a robust, centralized service layer. This will ensure that all updates and deletions are perfectly synchronized across the `Sale` totals (amount paid, balance due, status) and the `CashTransaction` ledger.

---

## 2. Identified Discrepancies
| Feature | Status | Current Issue |
| :--- | :--- | :--- |
| **Creation** | [PARTIAL] | Handled via raw logic in `ViewSet.create`. Mostly functional but lacks modularity. |
| **Update** | [BROKEN] | Updating an installment amount does NOT update the `Sale.amount_paid` or `Sale.balance_due`. |
| **Deletion** | [BROKEN] | Deleting an installment does NOT revert the `Sale.amount_paid` or adjust the `Sale.status` back to `INSTALLMENT`. |
| **Status Flow** | [INCOMPLETE] | `Sale.status` correctly switches to `COMPLETED` on full payment, but never reverts if a payment is deleted. |

---

## 3. Backend Refinement (`backend/sales/`)

### A. Modular Logic Service: `logic/installments.py`
Migrate all logic from `views.py` to professional service functions:
1.  **`process_installment_payment`**: 
    - Handles creation of `InstallmentPayment`.
    - Creates/Links `CashTransaction`.
    - Incrementally updates `Sale.amount_paid` and recomputes `balance_due`.
2.  **`update_installment_payment`**:
    - Calculates the delta between old and new amounts.
    - Updates `CashTransaction` amount.
    - Adjusts `Sale.amount_paid` by the delta.
3.  **`delete_installment_payment`**:
    - Reverts the `Sale.amount_paid`.
    - Reverts `Sale.status` from `COMPLETED` to `INSTALLMENT` if balance becomes > 0.
    - Deletes the associated `CashTransaction`.

### B. ViewSet Integration
Refactor `InstallmentPaymentViewSet` to be a "thin" wrapper that calls the `logic/installments.py` services, ensuring consistent behavior across all API interactions.

---

## 4. Frontend Refinement (`frontend/src/`)

### A. Component: `InstallmentHistoryDialog.tsx`
Refine the existing history view to support:
-   **Edit Payment**: Inline editing of payment amounts/notes.
-   **Delete Payment**: Confirmation dialog that warns about the impact on the Sale's balance.

### B. Syncing
Ensure `useInstallmentPayments` hook correctly triggers a refetch of the parent `Sale` object whenever a payment is modified, so the "Balance Due" updates in real-time on the UI.

---

## 5. Implementation Sequence
1.  **Backend Logic**: Build the full CRUD service in `logic/installments.py`.
2.  **ViewSet Refactor**: Update the API to use the new service.
3.  **Validation**: Run a Python test script to simulate payment, update, and deletion, verifying `Sale` totals at each step.
4.  **Frontend Updates**: Enhance the UI to support the new edit/delete capabilities.
