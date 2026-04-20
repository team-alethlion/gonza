# Customers Module Architectural Audit

## 1. Executive Summary

The Customers module is currently functional but suffers from **Logic Leaks** (heavy math in the browser) and **N+1 Performance Issues** (heavy subqueries in the backend list view). As the customer database grows beyond 500 records, the page will experience significant lag.

---

## 2. Technical Flaws

### 🛑 F1: Heavy Client-Side Aggregation

- **Location**: `frontend/src/hooks/useCustomerData.ts`
- **Issue**: The frontend is manually calculating "Category Breakdowns" and "Monthly Stats" by looping through the entire customer array in JavaScript.
- **Impact**: Browser UI freezes/stuttering when the customer list is large.
- **Solution**: Move these calculations to the backend `stats` endpoint using Django's `.values().annotate(Count('id'))`.

### 🛑 F2: Backend Subquery Overload

- **Location**: `backend/customers/views.py` (`CustomerViewSet.list`)
- **Issue**: For every customer returned in the list, the backend runs subqueries to find their total spent and order count.
- **Impact**: Extreme database pressure. A request for 100 customers triggers 200+ internal query operations.
- **Solution**: These metrics should be "On-Demand" (shown only when clicking a customer) or cached in a dedicated `CustomerSummary` table.

### 🛑 F3: Inefficient Inactivity Detection

- **Location**: `backend/customers/views.py` (`inactive` action)
- **Issue**: Uses a Python `for` loop to filter inactive customers instead of a database-level query.
- **Impact**: Slow response times and high memory usage on the server.
- **Solution**: Use a single ORM query: `Customer.objects.filter(branch_id=...).exclude(sales__date__gte=cutoff_date)`.

### 🛑 F4: Redundant API Requests

- **Location**: `CustomersClient.tsx`
- **Issue**: Three separate hooks (`useCustomers`, `useCustomerStats`, `useCustomerCategories`) fire 3+ independent requests on page mount.
- **Impact**: Increased network latency and "Chatty" API behavior.
- **Solution**: Create a unified `analytics/customers/summary` endpoint that returns initial stats, categories, and top customers in one payload.

### 🛑 F5: Lack of Optimistic UI / Brute Force Refresh

- **Location**: `CustomersClient.tsx` (`handleMergeComplete`)
- **Issue**: Uses `window.location.reload()` after a customer merge.
- **Impact**: Poor UX (white screen flash) and unnecessary bandwidth usage.
- **Solution**: Update the local state or use React Query invalidation to refresh only the affected data.

---

## 3. Data Integrity Risks

### ⚠️ R1: Guest Sale Linking

- **Issue**: `CustomerViewSet.list` tries to match guest sales by **Name** (`customer_name__iexact=OuterRef('name')`).
- **Risk**: If two different customers have the same name (e.g., "John Doe"), their "Lifetime Value" stats will be mixed together.
- **Solution**: Enforce strict ID-based linking for all financial aggregations.

### ⚠️ R2: Duplicate Detection Bypass

- **Issue**: The `duplicates` scan happens only on demand.
- **Risk**: New duplicates can be created at any time during checkout.
- **Solution**: Implement a "Check for existing" trigger during customer creation on the backend.

---

## 4. Recommended Action Plan

1.  **Refactor Stats**: Update backend `stats` action to return the full category breakdown.
2.  **Optimize List**: Remove heavy subqueries from the main list; show lifetime values only in the detail view.
3.  **Unified Fetching**: Consolidate initial page data into a single "Pre-fetch" payload.
4.  **UI Hardening**: Replace `window.location.reload()` with smooth state updates.
