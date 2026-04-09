# Investigation: Did the System Send a Duplicate "Paid" Request?

**Verdict: Incorrect. There are no duplicate network trips, and the backend never received or saved a "Paid" status.**

Here are the concrete, irrefutable code facts proving exactly why the Preview worked but the Final Receipt defaulted to Paid.

## FACT 1: The Network Logs Prove Only ONE Sale was Created
Looking at the backend logs you provided earlier:
```bash
DEBUG: Creating sale. Status: INSTALLMENT, Items count: 1
[09/Apr/2026 15:27:48] "POST /api/sales/sales/ HTTP/1.1" 201 1374
```
The Django server clearly logs that exactly **ONE** POST request arrived, and its status was strictly read as `INSTALLMENT`. There are no secondary trips for `Paid`. 

## FACT 2: Why Did the Preview Receipt Look Correct?
When you click **"Preview Receipt"**, the receipt modal is fed directly from your local React state (`formData`). Inside `formData`, the dropdown option is literally saved as a human-readable string: `"Installment Sale"`.

If we look at `ThermalReceipt.tsx` Line 102, the frontend is hardcoded strictly to read that exact label:
```tsx
  const displayAmountPaid =
    sale.paymentStatus === "Installment Sale"  // <--- Returns TRUE during Preview
      ? totalPaidFromHistory + (sale.amountPaid || 0)
//...
```
Because `"Installment Sale" === "Installment Sale"`, the Preview receipt displays the installment math perfectly.

## FACT 3: The Backend Data Mutation (The Culprit)
When you finally click **"Create Sale"**, `useSaleSubmit.ts` correctly sends `"Installment Sale"` to Django. 
But look at how Django handles it in `backend/sales/views.py` (Line 181):
```python
        # 🛡️ DATA INTEGRITY: Normalize incoming status strings
        if status_val == 'Paid': status_val = 'COMPLETED'
        if status_val == 'Installment Sale': status_val = 'INSTALLMENT'
```
The backend fundamentally converts your string into a database-level Enum: `"INSTALLMENT"`.
The backend then sends back a `201 Created` response containing the finalized sale object with `paymentStatus: "INSTALLMENT"`.

## FACT 4: The Final Receipt Betrayal
Your Next.js `useSaleSubmit.ts` takes this backend response and updates the UI state (Line 186):
```typescript
        paymentStatus: result.paymentStatus, // <--- This is now permanently "INSTALLMENT"
```
The React component re-renders the Receipt Modal with this finalized sale data.
But remember the hardcoded check inside `ThermalReceipt.tsx`?
```tsx
    sale.paymentStatus === "Installment Sale" // <--- Now evaluates to FALSE!
```
Because `"INSTALLMENT" !== "Installment Sale"`, the UI component is blind to the fact that it's an installment sale! It immediately falls into the fallback logic:
```tsx
      : (sale.paymentStatus === "Paid" && totalPaidFromHistory > 0)
      ? totalPaidFromHistory
      : sale.amountPaid || totalAmount; // <--- The default fallback!
```
It defaults completely to the standard Paid fallback, displaying the Grand Total (`totalAmount`) instead of your expected Due/Paid chunks.

### Summary
You did not trigger a duplicate trip, and the data was not sent underneath as Paid! Your database is completely safe and accurately recorded as an `INSTALLMENT`. The *only* issue simply lies in the UI receipt components (`ThermalReceipt.tsx`, `PrintableReceipt.tsx`); they refuse to render properly because they don't know that the word `"INSTALLMENT"` means `"Installment Sale"`.
