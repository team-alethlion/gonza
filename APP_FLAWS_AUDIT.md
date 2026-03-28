# Application Flaws & Logic Audit Study

This document outlines the potential flaws, inconsistencies, and "Visibility Gaps" identified during the study of the Sales, Inventory, and Dashboard modules.

---

<!-- ### 1. Missing Financial Integration (Sales -> Finance)
*   **The Flaw**: When a Sale is created and marked as "Paid", it records the revenue but does **not** automatically create a `CashTransaction` or update the linked `CashAccount` balance.
*   **The Impact**: Cash account balances in the Finance module will be inaccurate unless the user manually enters a corresponding "Cash In" transaction for every sale.
*   **Related Files**: `backend/sales/views.py`, `backend/finance/models.py`. -->

<!-- ### 2. Dashboard Data Inflation (Soft Deletes)

- **The Flaw**: The system uses soft deletion (`is_deleted=True`) for Sales. However, Dashboard aggregation endpoints like `category_summary`, `top_customers`, and `period_aggregate` do not filter out these deleted records.
- **The Impact**: Revenue, profit, and customer statistics on the Dashboard will be inflated by including sales that have been cancelled/deleted.
- **Related Files**: `backend/sales/views.py` (Actions: `category_summary`, `top_customers`, `stats`). -->

<!-- ### 3. Stale UI in Bulk Actions (Visibility Gap)

- **The Flaw**: `bulk_adjust` in the Inventory module uses `update_fields=['stock', 'cost_price']` during saves. This bypasses the `updated_at` field (auto_now).
- **The Impact**: The frontend's Delta Sync (`getProductsDeltaAction`) relies on the `updated_at` timestamp. Because this timestamp isn't updated during bulk adjustments, the frontend won't "see" the stock changes, leaving the UI with stale data.
- **Related Files**: `backend/inventory/views.py` (Method: `bulk_adjust`). -->

<!-- ### 4. Receipt Number Drift (Concurrency Risk)

- **The Flaw**: There are two different logic paths for receipt numbers. The "Preview" feature uses a regex-based incrementer on the last string found in the DB, while the "Save" path uses a robust `BranchCounter` with database locks.
- **The Impact**: If multiple users are creating sales, the preview number shown to the user may not match the actual receipt number assigned when the sale is saved.
- **Related Files**: `backend/sales/views.py` (Action: `next_receipt_number`) and `backend/sales/utils.py`. -->

<!-- ### 5. Authorization Fallback Risk

- **The Flaw**: In `verifyBranchAccess`, if the ownership check for an admin fails, the logic falls back to `if (!userBranchId) return sessionUser;`.
- **The Impact**: This is potentially too permissive. An admin user with a missing `branchId` in their session might bypass specific branch ownership checks, leading to a potential security risk.
- **Related Files**: `frontend/src/lib/auth-guard.ts`. -->

<!-- ### 6. P&L Historical Accuracy (Returns)

- **The Flaw**: The Profit & Loss report calculates the value of returns using the **current** selling price of the product (`product__selling_price`) rather than the price at the time the sale actually occurred.
- **The Impact**: If a product's price was changed after a sale but before a return, the P&L report will show incorrect "Sales Returns" and "Net Profit" values.
- **Related Files**: `backend/finance/views.py` (Action: `profit_loss`). -->

<!-- ### 7. Product Image Redundancy

- **The Flaw**: The `Product` model contains both `image` and `image_url` fields.
- **The Impact**: Different parts of the application might update one but not the other, leading to broken images or inconsistent displays in the UI.
- **Related Files**: `backend/inventory/models.py`. -->

<!-- ### 8. Loose Linkage (Auditability)

- **The Flaw**: The relationship between `Sale` and `CashTransaction` is managed via a `cash_transaction_id` string or a nullable foreign key, but the linkage isn't consistently enforced or bidirectional.
- **The Impact**: Difficulty in performing a "Deep Audit" (e.g., clicking a cash transaction and seeing exactly which Sale items generated that specific cash).
- **Related Files**: `backend/sales/models.py`, `backend/finance/models.py`. -->

<!-- ### 9. Sync-Clock Drift (Visibility Gap)

- **The Flaw**: The frontend `useProductSync` hook uses the client's local time (`Date.now()`) to tell the server when it last synced.
- **The Impact**: If a user's computer clock is even 1 minute ahead of the server, they might miss updates created on the server during that 1-minute window.
- **Related Files**: `frontend/src/hooks/useProductSync.ts`. -->

<!-- ### 10. Dashboard Rounding Discrepancies

- **The Flaw**: `sold_items` uses a pro-rata "weight" (item subtotal / sale subtotal) to attribute sale-level discounts and profits back to individual items.
- **The Impact**: Summing these weighted decimals can lead to minor rounding differences (e.g., $0.01 discrepancy) when comparing the "Sold Items" report to the "Sales Overview."
- **Related Files**: `backend/inventory/views.py` (Action: `sold_items`). -->

<!-- ### 11. Stock Audit Reconciliation Gap

- **The Flaw**: The `StockAudit` creation logic records the counted quantities and variances but does **not** actually update the `Product.stock` field to match the count.
- **The Impact**: Audits are currently "read-only" documentation. Users must perform a separate manual adjustment to actually fix their inventory levels after an audit.
- **Related Files**: `backend/inventory/views.py` (ViewSet: `StockAuditViewSet`). -->

<!-- ### 12. Inter-Branch Transfer Data Loss

- **The Flaw**: `StockTransfer` deductions happen based on SKU. If a product SKU exists in the source branch but not the destination branch, the stock is deducted from the source but never added to the destination.
- **The Impact**: Inventory can "vanish" from the system during transfers if the destination branch hasn't pre-created the product entry.
- **Related Files**: `backend/inventory/views.py` (ViewSet: `StockTransferViewSet`). -->

<!-- ### 13. SMS Credit Refund Logic

- **The Flaw**: Credits are deducted from the user's balance immediately when a message is marked as "sent" in the database.
- **The Impact**: If the external SMS gateway fails to actually deliver the message, there is no logic to "refund" the credits to the user, leading to financial loss for the client.
- **Related Files**: `backend/messaging/views.py`. -->

<!-- ### 14. WhatsApp Session Security

- **The Flaw**: `WhatsAppSession` data (which often contains sensitive authentication tokens) is stored in a plain `TextField`.
- **The Impact**: If the database is compromised, an attacker could hijack the active WhatsApp sessions of all users.
- **Related Files**: `backend/messaging/models.py`. -->

### 15. Cross-Tenant Onboarding Risk

- **The Flaw**: The `onboarding` action allows passing an arbitrary `agencyId` or `branchId` and then proceeds to overwrite the name and settings of that entity.
- **The Impact**: A malicious user could theoretically "hijack" another agency's onboarding settings by guessing or obtaining their ID and submitting the onboarding form with their own data.
- **Related Files**: `backend/core_app/views.py` (Action: `onboarding`).

<!-- ### 16. Hard-Coded Task Recurrence Limit

- **The Flaw**: Recurring tasks are generated with a hard-coded loop limit of 365 days.
- **The Impact**: If a user sets a long-term recurring task (e.g., a 2-year daily check), the system will silently stop generating tasks after one year without warning.
- **Related Files**: `backend/core_app/views.py` (ViewSet: `TaskViewSet`). -->

### 17. Analytics N+1 Performance

- **The Flaw**: The `AnalyticsViewSet.summary` method fetches recent sales and then passes them through a full `SaleSerializer`.
- **The Impact**: As the number of items per sale or the complexity of the sale model grows, this single dashboard call will trigger an "N+1" query storm, significantly slowing down the dashboard load time.
- **Related Files**: `backend/core_app/views.py` (Action: `summary`).
