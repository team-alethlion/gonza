# Research: Data Sync & Transaction Linkage Failures

## 1. Problem Identification
The logs show that sales records are failing to link with their payment transactions during the initial render:

```log
Looking for transaction with ID: ct-ry4l...
Available transactions count: 0
No linked transaction found for sale: sl_3785...
```

## 2. Root Cause Analysis (Deep Dive)

### A. Async Race Condition (Initial Load)
**Deep Evidence**: The `SalesPage` component uses SSR to fetch `sales` and `categories` using `Promise.all([getSalesAction(...), getSalesCategoriesAction(...)])`. However, **it does not fetch transactions**.
When the client-side `SalesTable` renders, the `sales` array is fully populated, but the `transactions` array (managed by the client-side `useCashTransactions` hook) is still in a `pending` state (length 0). This race condition causes the "Available transactions count: 0" error.

### B. Fragmentation of State (Database vs. Client Join)
**Deep Evidence**: The backend `SaleSerializer` simply returns `cash_transaction_id` (a string). The frontend is responsible for fetching the entire `transactions` table and performing a SQL-style `JOIN` in memory using `.find()`. 

### C. Pagination Mismatch
Because sales and transactions are paginated independently, a Sale on "Page 1" might be linked to a CashTransaction on "Page 3" of the transactions endpoint. The frontend join strategy is fundamentally flawed because it assumes all required transactions are present in the current client-side cache.

## 3. Recommended Optimization Strategy & Implementation

### Backend-Driven Joins (The Architecturally Sound Fix)
The frontend should never perform relational database joins. The backend must provide the necessary display data.

1. **Update Serializer**: Modify `SaleSerializer` in `backend/sales/serializers.py` to include the resolved account name directly.
```python
class SaleSerializer(serializers.ModelSerializer):
    # Add read-only fields that traverse the foreign keys
    cash_account_name = serializers.CharField(
        source='cash_transaction.account.name', 
        read_only=True, 
        default=None
    )
    
    class Meta:
        model = Sale
        fields = '__all__'
```

2. **Optimize ViewSet**: Update `SaleViewSet` to use `select_related` to fetch this data efficiently.
```python
def get_queryset(self):
    return super().get_queryset().select_related(
        'cash_transaction', 
        'cash_transaction__account'
    )
```

3. **Simplify Frontend**: Remove the `useCashTransactions` and `useCashAccounts` hooks completely from the Sales display components. `SalesTableRow` will simply render `sale.cashAccountName`. This instantly eliminates the race condition, the N+1 hook problem, and the pagination mismatch.
