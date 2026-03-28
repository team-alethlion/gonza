# Inventory System Flaws Audit

## Tab 1: Overview & Product List (Initial/Opening Stock)

<!-- ### 1. Initial/Opening Stock Inconsistency
- **The Flaw**: Opening stock is often treated as a static field on the `Product` model but is modified via frontend-calculated `bulkAdjustStockAction`.
- **The Risk**: If the frontend has an outdated view of the stock (due to race conditions or slow sync), it sends a "delta" or "absolute" change that overwrites the server's truth.
- **The Logic Flaw**: In `ProductForm.tsx`, when "Opening Stock" is entered for a new product, it's saved as the initial `quantity`. However, if the user "updates" this later, the system treats it as a manual adjustment rather than a corrected baseline, leading to messy history. -->

<!-- ### 2. Lack of Server-Side Inventory Guarding
- **The Flaw**: The frontend determines the `quantity_change` and sends it to `bulkAdjustStockAction`.
- **The Impact**: A malicious or buggy client can set stock to arbitrary values. The backend should ideally receive the "Actual Count" and calculate the adjustment itself based on the database's current state at the moment of execution. -->

## Tab 2: Bulk Stock Add (Restock)

<!-- ### 3. Date-Creation Conflict Logic is Frontend-Only
- **The Flaw**: `BulkStockAddTab.tsx` has complex logic to prevent adding stock *before* a product was created (`productDate.getTime() > entryDate.getTime()`).
- **The Risk**: This is purely a UI validation. The `bulkAdjustStockAction` doesn't strictly enforce this on the backend, allowing inconsistent historical data if the action is called directly or via a script.
- **Heavy Logic**: The chronological sorting and validation of the "earliest stock date" are handled entirely in the browser. -->

<!-- ### 4. Consolidated Rows Race Condition
- **The Flaw**: The tab consolidates duplicate rows in the frontend (`consolidatedRowsMap`) before sending to the backend.
- **The Risk**: If two users are restocking the same item simultaneously, the consolidation happens against a stale local cache of the product list. -->

## Tab 3: Stock Count (Audit)

<!-- ### 5. LocalStorage as Primary Buffer
- **The Flaw**: The entire audit progress is stored in `localStorage` (`stockCountData`).
- **The Risk**: If a user clears their browser cache or switches devices mid-audit, the data is lost. For a "Full List" audit of 10,000 items, this is extremely risky.
- **Data Integrity**: There is no "Draft Audit" on the server. The server only sees the final result, making it impossible to audit the auditor's progress or recover from crashes. -->

<!-- ### 6. "Complete Audit" Calculation Flaw
- **The Flaw**: `commitStockCount` calculates the `delta = newValue - product.quantity` using the `product.quantity` currently in the frontend's memory.
- **The Impact**: If a sale happens *while* the user is counting, the `product.quantity` in the frontend is now WRONG. When the audit is submitted, it will apply a delta that completely ignores the sale that just happened, resulting in permanent inventory drift.
- **Solution needed**: Backend must accept `actual_count` and calculate `delta = actual_count - current_db_count` inside a transaction. -->

## Tab 4: Stock Transfer

<!-- ### 7. Negative Stock Logic (Branch Leaks)
- **The Flaw**: `StockTransferTab.tsx` allows users to "Proceed Anyway" if a transfer exceeds available stock.
- **The Risk**: While the UI warns, the backend `recordStockTransferAction` allows this. If a branch's stock goes negative, it implies the system has lost track of the physical reality, potentially "leaking" stock into the destination branch that doesn't exist at the source. -->

<!-- ### 8. Multi-Step Transaction Risk
- **The Flaw**: Transfer logic involves deducting from Branch A and adding to Branch B.
- **The Risk**: If the server crashes between these two operations (if not wrapped in a strict atomic transaction with proper locking), Branch A loses stock but Branch B never receives it. -->

## General Architectural Flaws

<!-- ### 9. Timezone & "Naive" Datetime Risk

- **The Flaw**: Frontend uses `new Date().toISOString()`, while the backend often uses `timezone.now()`.
- **The Impact**: Discrepancies of a few hours can cause stock adjustments to appear in the "future" or "past" relative to sales, making stock-at-time-of-sale calculations nearly impossible to get right. -->

<!-- ### 10. Heavy Search Logic in Browser

- **The Flaw**: `useProducts(userId, 10000)` loads 10,000 products into memory just to power the search suggestions in Bulk Add and Stock Count.
- **The Impact**: On mobile devices or older computers, the UI will lag significantly as the product list grows. This should be a server-side "search-as-you-type" API call. -->
