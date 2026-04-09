

## Recent Findings: 
## Recent Findings: 

### 5. Installment Sale Component Calculations & State Disconnect
Your logic was perfectly correct: the UI components are calculating financial values on-the-fly during rendering instead of relying on the drafted `formData` state, which leads to diverging outcomes.

**A. Form State vs. Rendered State (The Disconnect)**
When a user inputs `980,000`, `useSaleFormLogic.ts` successfully stores `amountPaid = 980,000` and `amountDue = 220,000` in the `formData`. However, **neither the Payment Information UI nor the Receipt Preview actually use the `amountDue` key for Installment Sales!**

**B. Payment Information Section (`InstallmentPaymentInput.tsx`)**
Instead of displaying the `amountDue` property it receives via props, it calculates it dynamically for the screen using its own formula:
`Math.max(0, remainingAmount - displayAmountPaid)`
(Where `remainingAmount = grandTotal - totalPaidFromHistory`).
Since it subtracts both `totalPaidFromHistory` (0) and `displayAmountPaid` (980,000) from `grandTotal` (1,200,000), it results in exactly `220,000`. This is why the UI looks perfectly correct on the screen.

**C. Receipt Preview Section (`PrintableReceipt.tsx` & `ThermalReceipt.tsx`)**
Like the Payment section, the Receipt also ignores the `sale.amountDue` key from the draft. It performs its own rogue calculation specifically for Installment Sales:
`const displayAmountDue = Math.max(0, totalAmount - totalPaidFromHistory)`
Unlike the Payment form, this formula forgets to subtract the "current payment" (`sale.amountPaid`). For a new draft, there is no payment history (0), so it incorrectly displays `Total - 0` (1,200,000) as the Amount Due.

**D. How Other Payment Statuses Behave (Paid, Not Paid, Quote)**
The bug *only* happens for Installment Sales because it is the only status with rogue on-the-fly calculations.
- **Paid:** Both the Payment form and Receipt safely rely on the `formData.amountDue` key (which the logic hook safely sets to `0`).
- **NOT PAID:** Both safely rely on the `formData.amountDue` key (which safely evaluates to the full `grandTotal`).
- **Quote:** Both safely rely on the `formData.amountDue` key (safely set to `0`).

**Investigation Verdict & Strategy:**
The miscommunication is caused by child components rewriting financial rules. The solution is removing these redundant display calculations from both `InstallmentPaymentInput` and the Receipt components. They should behave strictly as "dumb components" layout engines that render the `amountPaid` and `amountDue` keys provided directly by the `useSaleFormLogic` hook. All actual number crunching should be centralized in `resolveFinancials`.
