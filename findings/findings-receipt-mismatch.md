# Research Findings: Why the Receipt Shows Undefined Data

**The Root Cause: The Mapping Matrix Destroys the `snake_case` Keys**

You proposed a brilliant strategy: *“we manipulate the receipt preview itself to have the pipe to match both scenarios ie `m.key1 || m.key2`”*.
We successfully implemented this inside `PrintableReceipt.tsx` and `ThermalReceipt.tsx` via `sale.receiptNumber || sale.receipt_number`.

**However, the pipe evaluating to `m.key2` is failing. Why?**

Because the incoming object (`sale`) no longer possesses `key2` (`receipt_number`). It was stripped during the `useSaleSubmit.ts` initialization.

Let's look at what is happening inside `useSaleSubmit.ts`:

```typescript
const sale: Sale = {
    id: result.id,
    receiptNumber: result.receiptNumber,  // <--- result is from Django. Django sent `receipt_number`, so result.receiptNumber is literally `undefined`.
    customerName: result.customerName,    // <--- Django sent `customer_name`, so result.customerName is `undefined`.
    ...
```

When this `const sale` dictionary is explicitly declared, it **permanently destroys** the backend's original `snake_case` keys:
- The dictionary creates a key called `receiptNumber`, and assigns it `undefined`. 
- The original `receipt_number` from the database `result` is purposefully left out of the dictionary entirely.

Because `useSaleSubmit.ts` deletes `receipt_number` instead of passing it forward, by the time the data reaches the Receipt Component, the object physically looks like this:
```json
{
  "receiptNumber": undefined,
  "customerName": undefined,
  "items": [ array objects ]
}
```

Since the `sale` object passed to the receipt does not have a `.receipt_number` property, our pipe `sale.receiptNumber || sale.receipt_number` evaluates to `undefined || undefined`!

### Proof of "Two Modal" Theory:
Why did `qty`, `unit price`, and `subtotal` successfully display on the receipt? 
Because the `items` array inside `useSaleSubmit.ts` DOES have a functioning fallback map:
```typescript
items: (result.items || []).map((si: any) => ({
    description: si.description || si.product_name || "Product", // <-- Here it successfully mapped product_name!
    price: Number(si.price || si.unit_price || 0), // <-- Here it successfully mapped unit_price!
    ...
}))
```
Because the `items` block explicitly mapped the variables directly using the `||` pipes DURING the dictionary creation, those strings successfully survived the journey to the receipt. But the master `sale` wrapper variables (`customerName` and `receiptNumber`) lacked the `||` map during initialization, so they were destroyed completely.

### The Solution:
If we want the Receipt to dynamically handle both keys efficiently, we must alter the explicit mapping creation to pass the keys downstream intact.

**Option A (The Safest Route):**
Update `useSaleSubmit.ts` merely to map the initial dictionary properly using the pipe locally:
```typescript
const sale: Sale = {
    receiptNumber: result.receiptNumber || result.receipt_number,
    customerName: props.formData.customerName || result.customerName || result.customer_name,
```

**Option B (The Pure Pipe Route):**
Instead of destructively declaring `const sale: Sale`, we pass the raw Django `result` natively directly to `onSaleComplete`, allowing `PrintableReceipt` to truly receive `receipt_number`.

Since you requested I don't modify code yet, I have documented this for your evaluation!
