# Implementation Plan: Professional Sales Returns System

## 1. Objective
Transition from the current destructive "Delete Sale" workflow to a professional "Sales Return" system. This will ensure data integrity, accurate inventory tracking (restocking), and precise financial reporting (refunds) without losing the history of the original sale.

---

## 2. Database & Model Layer (Verification & Refinement)
The core infrastructure already exists in migration `0011`, but we must ensure strict usage:
-   **`SalesReturn`**: Stores the header info (Sale reference, total refund, reason).
-   **`SalesReturnItem`**: Tracks exactly which `SaleItem` was returned and in what quantity.
-   **`ProductHistory`**: Must be updated to include a `RETURN_IN` entry whenever an item is restocked.
-   **`CashTransaction`**: Must record a `CASH_OUT` (Reference: RETURN) if money is refunded to the customer.

---

## 3. Backend Implementation (`backend/sales/`)

### A. Core Logic Module: `logic/returns.py`
Create a dedicated service to handle the "Return Lifecycle":
1.  **Validation**: 
    - Ensure returned quantity <= (original quantity - previously returned quantity).
    - Ensure the Sale is in a valid state (`COMPLETED`, `PARTIAL`, or `INSTALLMENT`).
2.  **Inventory Adjustment**: 
    - If `restock_inventory` is True: Increase `Product.stock` and create a `ProductHistory` record (Type: `RETURN_IN`).
3.  **Financial Processing**:
    - If `refund_amount > 0`: Create a `CashTransaction` associated with the specified `CashAccount`.
4.  **Sale State Update**:
    - If 100% of items are returned: Update `Sale.status` to `REFUNDED`.
    - If < 100% returned: Keep current status but the `ProfitLossEngine` will automatically subtract the return value.

### B. API Layer
1.  **Serializers**: Implement `SalesReturnSerializer` (nested items) and `SalesReturnItemSerializer`.
2.  **ViewSet**: Create `SalesReturnViewSet` with:
    - `create()`: Overridden to trigger the `returns.py` service.
    - `list()`: Filtered by `branchId` for multi-tenant isolation.
3.  **URLs**: Register `returns` endpoint in `sales/urls.py`.

---

## 4. Frontend Implementation (`frontend/src/`)

### A. Data Layer
1.  **Types**: Define `SalesReturn` and `SalesReturnItem` interfaces in `types/sales.ts`.
2.  **Server Actions**: Create `processSalesReturnAction` and `getSalesReturnsAction`.

### B. UI Components
1.  **Return Trigger**: Add a "Return Items" button to the `SalesTableRow` actions or within the `SalesReceiptDialog`.
2.  **`ProcessReturnDialog.tsx`**:
    - Displays all items from the original sale.
    - Input fields for "Return Quantity" (maxed at original qty).
    - Toggle for "Restock into Inventory".
    - Field for "Refund Amount" and "Cash Account" to refund from.
3.  **`ReturnsHistoryTab.tsx`**:
    - A new tab in the `Sales Management` page to view a ledger of all processed returns.

---

## 5. Profit & Loss Integration (Already Prepared)
The `ProfitLossEngine` implemented in Step 4 is already designed to pick up these records:
-   **Revenue**: Will subtract `Sum(SalesReturnItem.quantity * SaleItem.unit_price)`.
-   **COGS**: Will subtract `Sum(SalesReturnItem.quantity * SaleItem.cost_price)`.

---


