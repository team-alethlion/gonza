# Implementation Plan: Profit & Loss Refinement (COMPLETED)

## 1. Executive Summary
The Profit & Loss (P&L) tab has been upgraded from an approximation to a centralized, high-precision reporting engine. All identified discrepancies regarding "Tax Inflation" and "Returns Leakage" have been resolved.

## 2. Identified Discrepancies (RESOLVED)
| Metric | Status | Corrective Action Taken |
| :--- | :--- | :--- |
| **Sales (Revenue)** | [DONE] | Switched to `subtotal` (amount before tax/discount). |
| **Returns Inward** | [DONE] | Integrated with dedicated `SalesReturn` and `SalesReturnItem` models. |
| **COGS** | [DONE] | Calculated as `(cost * qty_sold) - (cost * qty_returned) + CarriageInwards`. |
| **Expenses** | [DONE] | Implemented database-level category breakdown with strict period enforcement. |

## 3. Backend Architecture: `ProfitLossEngine` (IMPLEMENTED)
The module `backend/finance/logic/profit_loss_engine.py` now orchestrates specialized calculators:

### Step 1: Revenue Calculation (`revenue.py`)
-   **Turnover**: Uses `Sum(subtotal)` for Accrual and `Sum(amount_paid)` for Cash basis.
-   **Returns**: Uses `Sum(quantity * unit_price)` from finalized return items.
-   **Net Revenue**: turnover - returns.

### Step 2: COGS (Cost of Goods Sold) (`cogs.py`)
-   **Gross Cost**: `Sum(cost_price * quantity)` from `SaleItem`.
-   **Return Cost**: `Sum(original_cost_price * quantity)` from `SalesReturnItem`.
-   **Carriage**: `Sum(amount)` from `CarriageInward`.
-   **Net COGS**: `Gross Cost - Return Cost + Carriage`.

### Step 3: Operating Expenses (`expenses.py`)
-   **Category Breakdown**: Grouped by category using SQL annotation.

## 4. Frontend Refinement (IMPLEMENTED)
-   **Table Update**: `ProfitLossTable.tsx` now features a professional **Trading Account** and **Profit & Loss Account** structure.
-   **Realization Toggle**: `ProfitLossTab.tsx` includes a toggle for **Accrual Basis** vs. **Cash Basis** reporting.

## 5. Implementation Status: 100% COMPLETE
1.  **Engine Development**: (DONE) Modular, high-precision calculators implemented.
2.  **View Integration**: (DONE) `CashAccountViewSet.profit_loss` updated with basis support.
3.  **PDF Synchronization**: (DONE) `ProfitLossGenerator` refactored to match the new professional structure.
4.  **Validation**: (DONE) Backend responses verified against raw database counts.
