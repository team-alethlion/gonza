# Stock Transfer Audit Report

## 1. Objective
Investigate the Stock Transfer implementation to identify bugs, UX issues, and data integrity risks.

## 2. Identified Bugs

### 🛑 Bug 1: Desktop Suggestion Drawer Premature Closure (High Priority)
*   **Symptom**: When searching for a product on Desktop, clicking anywhere on the suggestions drawer (or a specific product) causes it to close immediately without selecting anything.
*   **Technical Root Cause**:
    *   The `StockTransferTab.tsx` component implements a "Click Outside" listener using `mousedown` on a `containerRef` that wraps the tab.
    *   On **Desktop**, the `ProductSuggestionsPanel` uses a Radix UI `Sheet` component. Radix UI Sheets use **Portals**, meaning they are rendered at the end of the `<body>` tag, outside the React tree of the `StockTransferTab`.
    *   Because the drawer is physically outside the `containerRef`, the listener sees every click on the drawer as an "outside click" and triggers `closePanel()`.
*   **Race Condition**: `mousedown` fires before the `onClick` handler of the product item. The drawer is destroyed by the state update before the selection event can be processed.

### 🛑 Bug 2: Mobile Search Inconsistency
*   **Symptom**: On Mobile, the suggestion panel is rendered as an inline `div` instead of a sheet.
*   **Observation**: While the reported "Click Anywhere Closes" bug doesn't affect mobile (because the div is inside the container), the UI feels inconsistent with the rest of the application's drawer patterns.

---

## 3. Data Integrity & Logic Risks

### ⚠️ Risk 1: Strict SKU Dependency
*   **Issue**: The backend logic (`StockTransferViewSet.create`) and frontend payload use the `sku` field as the primary identifier for linking products between branches.
*   **Scenario**: If a business has products with `None` or empty SKUs, the filter `Product.objects.filter(sku=sku, branch_id=...)` will fail to distinguish between different products.
*   **Recommendation**: The system should use a combination of `sku` and `barcode`, or a standardized Global Product ID, to ensure the correct item is moved.

### ⚠️ Risk 2: Redundant Role Creation (Previously Reported)
*   **Issue**: Creating a new branch was triggering the creation of a new 'admin' role for that branch.
*   **Status**: **RESOLVED** in the previous turn. Roles are now Agency-scoped and reused across branches.

---

## 4. Verified Functional Strengths
Despite the UI bugs, the underlying engine is robust:
*   **Atomic Transactions**: Uses `transaction.atomic()` to ensure that stock is either deducted from Source AND added to Destination, or nothing happens. No partial transfers.
*   **Data Loss Protection**: If a product being transferred doesn't exist in the target branch, the server **automatically creates it**, including mapping the category.
*   **Race Condition Prevention**: Uses `select_for_update()` on product records during the transfer to prevent concurrent sales from causing inventory drift.
*   **Verification Guard**: Implements a manual code entry requirement for transfers that would result in negative stock.

## 5. Conclusion & Recommended Action Plan
The Stock Transfer system has a solid backend foundation but is currently "unusable" on Desktop due to the Portal/Click-Outside conflict.

**Recommended Fixes**:
1.  Update the "Click Outside" logic to ignore events originating from Portals or use a more robust detection method (e.g., checking for `data-radix-portal`).
2.  Switch `mousedown` to `click` for the outside-click listener to allow child events to fire first.
3.  Ensure the "Suggestions" panel on Desktop is rendered as a non-modal element if it needs to interact with the parent container's click listeners.
