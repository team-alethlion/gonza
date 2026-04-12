# Inventory Logic Deep-Dive: Accuracy & Reliability Report

## 1. Objective
Perform a deep search of the Inventory system to find invalid logic, verify if heavy logic is correctly handled by the backend, and audit the accuracy of Stock Summary (Opening/Closing stock) using direct database comparisons.

## 2. Sold Items Analysis (Top Selling Products)

### ✅ Logic Source: Backend Aggregated
*   **Location**: `backend/inventory/views.py` -> `sold_items` action.
*   **Finding**: The logic is correctly handled on the backend. It uses a sophisticated **Pro-Rata Attribution** algorithm to distribute Sale-level discounts and profits across individual items.
*   **Accuracy**: High. By calculating these values on the server, it ensures that the sum of all individual items exactly matches the total revenue and profit reported in the Sales module.

---

## 3. Stock Summary Investigation (Critical Issues)

### 🚨 Critical: The "Zero-Quantity Drift" in History
**Location**: `inventory_producthistory` table and `summary_report` action.
*   **The Issue**: Direct database inspection revealed that many history records have a `quantity_change` of `0`, even though the `new_stock` field correctly reflects a deduction (e.g., `SALE: 0 -> 14`).
*   **Root Cause**: In several parts of the system, when a sale or update occurs, the backend updates the `Product.stock` but fails to record the delta (`quantity_change`) in the `ProductHistory` record.
*   **The Impact on Reports**: The `Stock Summary` report calculates "Items Sold" using SQL aggregates: `SUM(ABS("new_stock" - "old_stock"))`. If `old_stock` was not correctly saved in the history record, the report returns **0** or **incorrect totals** for that period.

### 🚨 Invalid Logic: Reverse-Engineered Opening Stock
**Location**: `backend/inventory/views.py` -> `summary_report`
*   **The Code**: `opening_stock = closing_stock - (stock_in + adj_in) + (items_sold + adj_out)`
*   **The Flaw**: This logic assumes the system has a **perfect history chain**. Because of the "Zero-Quantity Drift" mentioned above, the `stock_in` and `items_sold` variables are often under-reported.
*   **The Result**: The "Opening Stock" shown in the UI is mathematically "forced" to match the current stock, but it does not reflect the **actual** stock you had at the start of the period if history records are missing or corrupted.

---

## 4. Inventory Overview Accuracy

### ✅ Resolved: Partial Data Hazard
*   **Status**: Fixed. The `StockLevelChart` and `InventoryStats` now strictly use server-side aggregates from `get_inventory_stats`.
*   **Accuracy**: High for current snapshots.

### ⚠️ UX Flaw: Snapshot vs. Period
*   **Finding**: The "Stats Cards" at the top of the Inventory page are **Current Snapshots** (Total Value *now*). However, the "Top Selling" table right below them is filtered by **Period** (This Month).
*   **Risk**: This can lead to confusion where a user sees a high "Stock Value" but low "Top Selling" numbers, not realizing they are looking at two different time contexts.

---

## 5. Recommendations

### 🚀 Recommendation 1: Fix History Logging
Update the `SaleViewSet` and `ProductViewSet` to ensure `quantity_change` and `old_stock` are **always** calculated and saved in the `ProductHistory` table. Without this, the Stock Summary will never be 100% accurate.

### 🚀 Recommendation 2: Hardware Opening Stock
Instead of "calculating" opening stock by subtracting changes from the current stock, the system should find the **first history record** before the `startDate` and use its `new_stock` as the true Opening Balance.

### 🚀 Recommendation 3: Implement Date Filtering for Stats
The `get_inventory_stats` utility should be updated to accept `startDate` and `endDate` so the entire Inventory Overview can be filtered as a single unit.

## 6. Conclusion
The Inventory system has a solid backend foundation, but the **Stock Summary** is currently unreliable due to inconsistent history logging ("Zero-Quantity Drift"). While the "Overview" and "Sold Items" are mathematically correct for snapshots, the historical reports require a hardening of the data-capture layer to ensure Opening and Closing stocks are accurate.
