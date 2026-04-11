# Sales Source (Category Analysis) Investigation Report

## 1. Objective
Investigate the "Sales Source" tab on the Sales Page to verify the accuracy of category-based sales calculations, specifically addressing the user's report that counts are stuck at "1" despite many sales existing for those categories.

## 2. Technical Findings

### 🚨 Root Cause 1: Django ORM `GROUP BY` Bug
The investigation confirmed that the category table was returning "1" for every row due to an unintended `GROUP BY` clause.
*   **The Issue**: The `Sale` model has a default ordering of `-created_at`. In Django, when you use `.values('category_id').annotate()`, the ORM automatically adds the default ordering fields to the `GROUP BY` clause.
*   **The Impact**: Results were being grouped by `category_id` AND `created_at` (a unique timestamp), forcing every sale into its own unique bucket.

### 🚨 Root Cause 2: Non-Normalized `categoryId` Data
A secondary issue was found in how "Uncategorized" sales were being handled.
*   **The Issue**: The frontend form state defaults `categoryId` to an empty string `""`. In some cases, the word `"category"` (a placeholder) was also being sent.
*   **The Impact**: The database saved some records with `category_id=NULL`, some with `category_id=""`, and potentially some with `category_id="category"`. The backend summary was only aggregating the `NULL` ones as "Uncategorized," leaving the others effectively hidden or scattered.

---

## 3. Resolutions Implemented

### ✅ Fix 1: Cleared Default Ordering (Backend)
Surgically updated `category_summary` in `backend/sales/views.py` to include `.order_by()`.
*   **Result**: This forces Django to drop the `created_at` field from the SQL grouping, allowing correct aggregation strictly by category.

### ✅ Fix 2: Unified "Uncategorized" Logic (Backend)
Updated the backend summary logic to merge stats for `NULL`, `""`, and `"category"`.
*   **Result**: All sales without a valid category ID are now correctly summed into the "Uncategorized" row.

### ✅ Fix 3: Input Normalization (Frontend & Backend)
*   **Frontend**: Updated `upsertSaleAction` to convert `""` or `"category"` to `null` before sending the request.
*   **Backend**: Updated `_create_sale_from_data` and `update` methods to ensure any incoming empty or invalid category strings are saved as `None` in the database.
*   **Result**: New sales will now have a clean, consistent data structure in the database.

---

## 4. Conclusion
The Sales Source tab is now fully accurate. It correctly aggregates all sales into their respective categories by bypassing the Django ORM grouping bug and normalizing inconsistent "Uncategorized" data from the forms. The "Number of Sales" column will now reflect the true volume of transactions for each source.
