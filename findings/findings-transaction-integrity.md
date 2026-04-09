# Code-Level Investigation Facts

## FACT 1: The Missing `locationId` in Frontend Logic
The exact cause of the "Unauthorized: You do not have access to this branch" error is a missing argument in `src/hooks/useCashTransactionOperations.ts`.

**The Literal Code Evidence:**
In `src/hooks/useCashTransactionOperations.ts` (Lines 144-148):
```typescript
      if (!linkToCash || !selectedCashAccountId) {
        return await createInstallmentPayment({
          saleId,
          amount,
        }); // <-- FACT: `locationId` is completely omitted from this payload
      }
```

Because `locationId` is dropped from the payload right here, it lands in the server action `src/app/actions/finance.ts` as `undefined`. 
Then, `createInstallmentPaymentAction` executes `await verifyBranchAccess(data.locationId);` — which resolves to `verifyBranchAccess(undefined)`. This directly triggers the exact error you caught: `Unauthorized: You do not have access to this branch`.

## FACT 2: Why the Sale Still Creates Despite the Error
The reason the sale creates successfully, but the error still crashes the page, is because the execution happens via two independent server actions inside `src/hooks/sale-form/useSaleSubmit.ts`.

**The Literal Code Evidence:**
In `src/hooks/sale-form/useSaleSubmit.ts`:
1. First, the Sale is submitted and committed to the database (Line 153):
```typescript
      const { success, data: saleResult, error } = await upsertSaleAction(saleDbData, ...);
```
2. Much later in the exact same function (Line 231), it attempts to fire a completely separate request to record the initial payment:
```typescript
          await props.createInstallmentPaymentWithCash(
            sale.id,
            props.formData.amountPaid,
            ...
          ); // <-- Error is thrown here
```

**The Fact:** Because these are two separate `await` calls to two separate server actions, the database transaction is NOT atomic. When Step 2 throws the "Unauthorized" error, Step 1 has already fully completed. The function crashes, the page doesn't redirect, but the sale is already saved permanently.

## FACT 3: Enforcing Django Atomicity To Prevent This
To properly respect the protocol of "never skipping updates if a request fails", we cannot have two separate network requests. Next.js cannot rollback a Django database if a subsequent `fetch` fails. 

**The Literal Code Evidence (Backend):**
Currently, in `backend/sales/views.py` (`_create_sale_from_data`), Django natively creates cash transactions inside an atomic block for Paid sales (Lines 240-269).
```python
        # ⚡️ FINANCIAL INTEGRATION: Create Cash Transaction if linked and Paid
        if link_to_cash and cash_account_id and status_val == 'COMPLETED':
             cash_tx = CashTransaction.objects.create(...)
```

**The Fact-Based Solution:**
Instead of making Next.js manually fire `createInstallmentPaymentWithCash` *after* the sale over the network, we must add the corresponding internal logic directly into Django's `_create_sale_from_data` for Installment Payments:
```python
        if final_status == 'INSTALLMENT' and pay['amount_paid'] > 0:
            InstallmentPayment.objects.create(...) # Done securely server-side
```
Because `views.py` `create` is decorated with `@transaction.atomic`, if the `InstallmentPayment` fails to create internally (due to logic bugs or constraints), Django will naturally rollback the `Sale` and `Inventory` changes automatically—ensuring 100% data integrity with zero orphaned data.
