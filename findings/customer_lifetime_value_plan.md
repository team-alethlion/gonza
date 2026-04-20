# Plan: Restore Customer Lifetime Value (Performance-First)

## 1. The Problem

<!-- "Lifetime Value" and "Order Count" are showing as 0 in the All Customers tab.

- **Cause**: These fields were removed from the backend `list` method to optimize performance (N+1 query prevention).
- **Impact**: Incorrect data visibility in the main management table. -->

## 2. The Challenge

Calculating these values for every customer in a list of 1,000+ items is historically slow in Django because it usually requires complex subqueries or multiple database hits.

## 3. Recommended Solution: Denormalization (Enterprise Pattern)

Instead of calculating the total every time you open the page, we will store the value directly on the `Customer` model.

### Phase 1: Database Enhancement

- Add `total_spent` and `order_count` fields to the `Customer` model.
- These fields will default to 0.

### Phase 2: Automated Sync (Signals)

- Implement a Django `post_save` and `post_delete` signal on the `Sale` model.
- Whenever a sale is made, updated, or deleted, the system will automatically update the specific customer's `total_spent` and `order_count` in the background.
- This makes the "List" view 100% instant because it just reads a simple number from the table.

### Phase 3: Data Migration

- Run a one-time migration script to calculate and populate these new fields for all existing customers based on their historical sales.

### Phase 4: Frontend Update

- Update `CustomerList.tsx` to read the new `total_spent` field from the API.

## 4. Why this approach?

- **Speed**: The Customers page will load instantly regardless of how many sales you have.
- **Accuracy**: Data is updated in real-time by the server whenever a transaction occurs.
- **Scalability**: This is the same pattern used by high-scale ERP systems.

## 5. Alternative (Quick Fix)

- Use a single `GROUP BY` query in the `list` method. This is easier but will eventually get slow as you reach tens of thousands of sales.
