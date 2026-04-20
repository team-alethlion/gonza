# Global Architectural Performance Audit

## 1. Executive Summary
The investigation confirms that the performance issues (3.5s render time, high backend latency) are not isolated to the Sales page. They are systemic, rooted in a "Leaf-Node Fetching" architecture on the frontend and "Missing Query Optimizations" on the backend.

## 2. Global Backend Bottlenecks (N+1 Storms)

### A. Sales Module (`backend/sales/views.py`)
- **Observation**: `SaleViewSet` uses `prefetch_related` for items but lacks `select_related` for its Foreign Keys.
- **Deep Evidence**: `SaleSerializer` uses `fields = '__all__'`. When DRF serializes 50 sales, it must resolve the `customer_id`, `user_id`, `branch_id`, and `cash_transaction_id` for every single row. Without `select_related`, Django executes a separate SQL `SELECT` for each foreign key on each row.
- **Impact**: Serializing a list of 50 sales triggers **150+ redundant database queries**.

### B. Inventory Module (`backend/inventory/views.py`)
- **Observation**: `ProductViewSet` lacks ALL query optimizations.
- **Deep Evidence**: `queryset = Product.objects.all()`. When serializing the `Product` model, any access to `category_id` or `supplier_id` triggers an N+1 query storm.
- **Impact**: The Inventory page suffers massive degradation as the product count scales.

## 3. Global Frontend Bottlenecks (Context & Hook Abuse)

### A. Systemic Row-Level Hook Instantiation
- **Deep Evidence**: Critical hooks like `useFinancialVisibility`, `useBusinessSettings`, and `useProfiles` are heavily utilized inside `TableRow` and `Card` components across the application (`InventoryTable`, `RecentSalesTable`, `CustomersTable`).
- **Impact**: Because these hooks subscribe to React Contexts and perform complex permission logic (string matching, role checking), rendering a table with 100 rows results in 100 separate context subscriptions and thousands of synchronous permission evaluations per render.

## 4. Strategic Recommendations & Implementation

### Backend: ORM Optimization
Update all major ViewSets to explicitly define `select_related` (for ForeignKeys/OneToOne) and `prefetch_related` (for ManyToMany/Reverse ForeignKeys).

**Example (`SaleViewSet`)**:
```python
queryset = Sale.objects.select_related(
    'customer', 
    'user', 
    'branch',
    'cash_transaction',
    'cash_transaction__account'
).prefetch_related(
    'items', 
    'installments'
)
```

**Example (`ProductViewSet`)**:
```python
queryset = Product.objects.select_related('category', 'supplier', 'branch')
```

### Frontend: Centralized Configuration Pattern
Refactor the React architecture from "Smart Rows" to "Dumb Rows".

1. **Top-Level Fetching**: The parent component (e.g., `SalesTable`, `InventoryClient`) should call `useFinancialVisibility()` and `useBusinessSettings()` exactly once.
2. **Prop Drilling**: Pass a single consolidated configuration object to the list mapping function.
3. **Memoization**: Wrap row components in `React.memo` to prevent re-renders unless the specific record data changes, decoupling them from global context updates.
