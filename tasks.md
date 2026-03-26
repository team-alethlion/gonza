- proper recipt number generation function
- check for relations
- ensure that only data for that user, agency and branch is downloaded

without accidentally writing over code that you
should not be editing

I have completed my investigation into the sale data handling, financial
calculations, and data integrity. My findings reveal several critical flaws
that impact accuracy, reporting, and long-term maintainability.

  <!-- 1. Double Computation & Inconsistent Logic
  There is significant redundancy and inconsistency between the frontend and
  backend calculations:
   * The Conflict: Both the frontend (useFormCalculations.ts) and the backend
     (SaleViewSet.calculate_financials) perform their own math. However, the
     backend is the ultimate "source of truth" and recalculates everything from
     scratch, ignoring the final values sent by the frontend.
   * Profit Calculation Flaw (Critical): 
       * Frontend Logic: Correctly calculates profit as (Revenue - Discount) -
         Cost.
       * Backend Logic: Incorrectly calculates profit as (Revenue - Discount +
         Tax) - Cost.
       * Impact: This results in an inflated profit figure in your database and
         admin dashboard, as tax (a liability) is being treated as income. -->

  <!-- 2. Incomplete Data Mapping
  The synchronization between the form and the database is missing several
  fields:
   * Hardcoded Zeros: The mapSaleToDbSale function on the frontend currently
     hardcodes discount: 0, meaning even if you apply a discount in the form,
     the database's discount field stays zero (though the total is correctly
     adjusted by the backend).
   * Missing Fields in Payload: Fields like shipping_cost, discount_reason, and
     payment_reference exist in the database model but are neither captured by
     the frontend form nor sent in the API payload.
   * Mapping Gaps: During sale creation, customer_phone and customer_address
     were being ignored (until my previous fix). However, other fields like
     tax_amount and subtotal are being recalculated by the frontend using
     outdated logic that doesn't account for item-level discounts, potentially
     leading to discrepancies if the frontend uses these values for receipt
     previews before the server responds. -->

<!-- 3. Dead Model Fields & Hard Deletions

- Soft Delete Flaw: Your Sale model includes is_deleted, deleted_at, and
  deleted_reason fields, implying a "Soft Delete" strategy. However, the
  actual deletion logic (process_sale_deletion.py) performs a Hard Delete
  (sale.delete()), which permanently removes the record from the database.
- Impact on Statistics: Because records are hard-deleted, you lose all audit
  history of deleted sales. The is_deleted and deleted_at fields will always
  be empty or False, making them "dead weight" in your database and
  potentially leading to inaccurate historical reporting if you expected to
  track why sales were cancelled. -->

4. Accuracy of "Balance Due"

- The system correctly handles partial payments (amount_paid and
  balance_due), but there is a risk: if a user updates a sale and changes the
  items (increasing the total), the balance_due is recalculated, but the link
  to the original CashTransaction might not be updated to reflect the change
  in the initial deposit, leading to a mismatch between your Sales records
  and your Cash Account records.

Summary of Potential Flaws

┌─────────────┬───────────────────────────────┬────────────────────────┐
│ Area │ Flaw │ Impact │
├─────────────┼───────────────────────────────┼────────────────────────┤
│ Profit │ Tax is added to profit │ Inflated earnings │
│ │ │ reports │
│ Discounts │ discount field hardcoded to 0 │ Inaccurate discount │
│ │ in mapping │ reporting │
│ Soft Delete │ Logic performs hard delete │ Loss of audit trail │
│ │ instead │ │
│ Redundancy │ Frontend and Backend both do │ Risk of UI/DB data │
│ │ math │ mismatch │
│ Missing │ Shipping, reasons, and refs │ Incomplete transaction │
│ Data │ not captured │ records │
└─────────────┴───────────────────────────────┴────────────────────────┘
