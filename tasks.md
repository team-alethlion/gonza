- proper recipt number generation function
- check for relations
- ensure that only data for that user, agency and branch is downloaded

- RCP-JAV-2026-00001









 Implementation Plan (Directive Ready)

  1. Backend: Robust Stock Deduction & Validation
   * Location: backend/sales/views.py in _process_inventory.
   * Logic: 
       * Implement a check to see if qty_sold > product.stock.
       * If qty_sold > product.stock:
           * Option A (Strict): Raise a validation error (prevents the sale).
           * Option B (Flexible - User's Request): Deduct stock into negative OR
             deduct only what is available and log the rest as "sourced
             externally".
           * Technical Note: The user mentioned "it's possible to sell an item
             you do not have... get it from another person then sell it". This
             suggests we should allow negative stock but log it clearly in
             ProductHistory.
       * Data Integrity: Ensure select_for_update() is used (already there) to
         prevent race conditions during concurrent sales.

  2. Frontend: User Awareness & Warnings
   * Untracked Sales Warning:
       * Location: frontend/src/components/ProductSaleItemInput.tsx.
       * Action: If a user types a description but hasn't selected a product
         from suggestions (i.e., !item.productId), show a subtle warning: "⚠️
         This item is not linked to inventory. Stock will not be tracked."
   * Over-selling Warning:
       * Location: frontend/src/components/ProductSaleItemInput.tsx.
       * Action: Compare item.quantity with product.quantity. If item.quantity >
         product.quantity, show a warning: "⚠️ Selling more than available in
         stock ({product.quantity})."
   * Pre-Submit Validation:
       * Location: frontend/src/hooks/sale-form/useSaleSubmit.ts.
       * Action: Before calling the API, check if any items have !productId or
         quantity > stock. If they do, show a confirmation dialog: "Some items
         are not in stock or not linked to inventory. Do you want to proceed?"

  3. Investigation of "Same Amount 13" Bug
   * The backend logic _process_inventory looks correct. If it didn't reduce
     from 13 to a lower number, it means:
       1. The productId sent from the frontend didn't match any Product in the
          database.
       2. status_val was QUOTE.
       3. The transaction.atomic failed and rolled back (but the user said the
          sale was created).
   * Action: I will add logging to the backend to track exactly which product_id
     is being processed.