# Potential Flaws & Data Accuracy Issues

## 1. CRITICAL: Client-Orchestrated Split Transactions (FIXED)

- **Reference:** `src/hooks/useNewSaleActions.ts` (handleSaleComplete), `src/hooks/useSalesData.ts` (deleteSale)
- **Flaw:** Creating or deleting a sale and deducting/restoring inventory happens in two separate client-side orchestrated requests.
- **Danger:** Partial success (Sale saved, Inventory not updated) leads to permanent stock inaccuracy if the network drops.
- **Fix:** Merge all sale-related operations (Sale creation, stock deduction, cash transaction) into a single server-side Prisma transaction (`db.$transaction`).

## 2. CRITICAL: Multi-tenancy / Authorization Leak (Broken Access Control) (FIXED)

- **Reference:** `src/app/actions/customers.ts`, `src/app/actions/sales.ts`, `src/app/actions/activity.ts`, `src/app/api/print-receipt/route.ts`
- **Flaw:** Several actions and the print API only take the `id` of the resource but don't check if that ID belongs to the authenticated user's branch.
- **Danger:** Any authenticated user can modify or delete data belonging to _another_ business by simply guessing or iterating on UUIDs/IDs. The `print-receipt` API is entirely unauthenticated, allowing a total leak of all sale details and customer names.
- **Fix:** Every destructive or read action MUST check the resource against the authenticated user's actual `branchId` from the session. The print API must require a valid session and verify ownership of the `saleId`.

## 3. CRITICAL: Data Leakage in Activity History (FIXED)

- **Reference:** `src/app/actions/activity.ts` (getActivityHistoryAction)
- **Flaw:** If `userId` is set to `'ALL'`, the filter is skipped.
- **Danger:** Any user can view the _full_ activity history of a branch.
- **Fix:** Implement a role check within the action. If `userId` is `'ALL'`, verify that the requesting user has 'admin' or 'manager' permissions before returning the full history.

## 4. CRITICAL: Subscription Price Injection (FIXED)

- **Reference:** `src/app/actions/billing.ts` (initiateSubscriptionPaymentAction)
- **Flaw:** The subscription `amount` is passed directly from the client.
- **Danger:** A user can modify the request to pay a fraction of the actual cost.
- **Fix:** Hardcode the plan prices on the server or fetch them from a secure `Package` table. Calculate the total based on the `billingCycle` server-side, ignoring the amount sent by the client.

## 5. CRITICAL: SMS Credit Race Condition (FIXED)

- **Reference:** `src/app/actions/messaging.ts` (createMessageAction)
- **Flaw:** Messages are created and credits are deducted in two separate, non-atomic steps.
- **Danger:** A user with 0 credits can still send messages.
- **Fix:** Wrap the credit check and deduction in a Prisma transaction. Use `db.user.update` with a `where` clause that includes `credits: { gte: 1 }` to ensure the update only succeeds if credits are available.

## 6. Race Condition in Receipt Number Generation (FIXED)

- **Reference:** `src/app/actions/inventory.ts` (getNextReceiptNumberAction), `src/app/actions/products.ts` (createProductAction)
- **Flaw:** It fetches the "last" receipt number or SKU and increments it in the application layer.
- **Danger:** Concurrent users will generate the same receipt number or SKU, causing database unique constraint violations and failed sales.
- **Fix:** Use a database sequence, an atomic counter table, or a high-entropy unique ID generator (like CUIDs or Nanoid) that doesn't depend on the current state.

## 7. Financial Inaccuracy: Float vs Decimal (FIXED IN SCHEMA)

- **Reference:** `prisma/schema/inventory.prisma` (Product model), `prisma/schema/finance.prisma` (CashAccount model)
- **Flaw:** Many financial fields are `Float` in the Product model and `initialBalance` is `Float`.
- **Danger:** Floating point numbers lead to penny-discrepancies in financial reports due to IEEE 754 precision issues.
- **Fix:** Update the Prisma schema to use the `Decimal` type for all currency and price fields.

## 8. Data Loss on Sale Deletion (FIXED)

- **Reference:** `src/app/actions/sales.ts` (deleteSaleAction)
- **Flaw:** Deleting a sale record does not restore the stock to the inventory.
- **Fix:** Within the `deleteSaleAction` transaction, first retrieve the sale items, then iterate through them to `increment` the stock levels of the corresponding products before deleting the sale.

## 9. Audit Trail Gaps in Bulk Updates

- **Reference:** `src/app/actions/products.ts` (updateProductsBulkAction)
- **Flaw:** Bulk updates to products skip the `ProductHistory` logging.
- **Fix:** Update the bulk action to perform a `createMany` on the `ProductHistory` table within the same transaction as the product updates, capturing the quantity changes for every affected item.

## 10. Hardcoded Placeholder Data (FIXED)

- **Reference:** `src/app/actions/sales.ts` (upsertSaleAction)
- **Flaw:** `subtotal` and `total` are hardcoded as `0`.
- **Fix:** Calculate the actual subtotal and total from the `items` array on the server before saving. Do not rely on client-side calculations or placeholders.

## 11. Redundant and Potentially Out-of-Sync User Status (FIXED)

- **Reference:** `prisma/schema/auth.prisma` (User model)
- **Flaw:** Both `isActive` (Boolean) and `status` (String) exist.
- **Danger:** If one is updated and the other isn't, it could lead to logical errors.
- **Fix:** Consolidate into a single `status` enum (e.g., `ACTIVE`, `INACTIVE`, `SUSPENDED`). Update all application logic to check this single source of truth.

## 12. CRITICAL: Unauthenticated Nuclear Wipe (Business Reset) (FIXED)

- **Reference:** `src/app/actions/business.ts` (resetBusinessAction)
- **Flaw:** The function never validates that the `userId` is actually the admin of the `branchId`.
- **Danger:** Any authenticated user can trigger a complete data wipe of any branch.
- **Fix:** Add a check to verify that the `userId` matches the `adminId` of the `Branch` being reset before proceeding with the deletion transaction.

## 13. Plain-Text Security PINs

- **Reference:** `src/app/actions/profiles.ts` (createProfileAction, updateProfileAction)
- **Flaw:** The user's `pin` is saved to the database in plain text.
- **Fix:** Hash the PIN using `bcryptjs` before saving it to the database, exactly how passwords are handled. Use `compare` for verification.

## 14. Unsafe Role Deletion (IDOR) (FIXED)

- **Reference:** `src/app/actions/profiles.ts` (deleteRoleAction)
- **Flaw:** The action deletes a role using `where: { id: roleId }` without verifying it belongs to the user's `branchId`.
- **Fix:** Change the delete condition to `where: { id: roleId, branchId: userBranchId }` and ensure system-default roles (where `branchId` is null) are protected from deletion.

## 15. Cross-Tenant Bulk Product Modification (IDOR) (FIXED)

- **Reference:** `src/app/actions/products.ts` (updateProductsBulkAction)
- **Flaw:** The Prisma `update` query only filters by `where: { id: u.id }`.
- **Danger:** An authenticated user can modify products belonging to other tenants.
- **Fix:** Change the query to `where: { id: u.id, branchId: businessId }` to ensure the product belongs to the user's tenant before updating.

## 16. Unvalidated Array Lengths in Requisitions (FIXED)

- **Reference:** `src/app/actions/inventory.ts` (createRequisitionAction)
- **Flaw:** The `items` array from the client payload is saved directly into the database as a JSON blob without structural validation.
- **Fix:** Define a Zod schema for the requisition items and validate the input array's structure and length (e.g., max 100 items) before saving.

## 17. CRITICAL: Widespread Financial IDOR (Insecure Direct Object Reference) (FIXED)

- **Reference:** `src/app/actions/finance.ts`
- **Flaw:** Almost every update and delete function queries the database using ONLY `where: { id }`.
- **Danger:** A user can delete/modify financial records (Expenses, Cash Transactions, Installments) of every single business on the platform.
- **Fix:** Update every query to include the branch context: `where: { id: resourceId, branchId: userSessionBranchId }`.

## 18. CRITICAL: Client-Side Inventory Deduction (Security Risk) (FIXED)

- **Reference:** `src/hooks/useInventoryActions.ts`
- **Flaw:** The final `quantity` after a sale is calculated on the client and sent to the server.
- **Danger:**
  - **Security**: A user can manually inject an update to set their product stock to 1,000,000 for free.
  - **Integrity**: Two simultaneous sales will overwrite each other's stock deductions because they fetch the "current" stock separately.
- **Fix**: Move stock deduction to the server. Use Prisma's atomic `update` with `decrement` (e.g., `stock: { decrement: quantitySold }`) inside the sale transaction.

## 19. CRITICAL: Sign Up Without Agency Context (FIXED)

- **Reference:** `src/app/actions/auth.ts` (signUpAction)
- **Flaw:** Users can sign up but aren't associated with an `Agency` or `Branch`.
- **Danger:** Every subsequent action that depends on `branchId` or `agencyId` will fail or return empty data.
- **Fix:** Update the sign-up flow to either create a default `Agency` and `Branch` for the new user or require them to join an existing one immediately after registration.

## 20. Dummy Reset Password Logic (FIXED)

- **Reference:** `src/app/actions/auth.ts` (resetPasswordAction)
- **Flaw:** Uses `"extract-from-token"` as a literal placeholder for user identification. This is entirely broken and insecure.
- **Fix:** Implement a real password reset flow using short-lived JWTs or database-stored tokens (`PasswordResetToken` model). Verify the token, find the associated user, and then update their password.

## 21. Non-Atomic Stock Updates (FIXED)

- **Reference:** `src/app/actions/inventory.ts` (createStockHistoryAction)
- **Flaw:** Uses `await tx.product.update({ data: { stock: data.newQuantity } })`.
- **Danger**: This is not an atomic operation. If two concurrent requests try to update stock, one will be lost.
- **Fix:** Use atomic updates: `{ stock: { increment: change } }` or `{ stock: { decrement: Math.abs(change) } }`.

## 22. Incomplete Data Deletion Request (FIXED)

- **Reference:** `src/utils/emailService.ts` (sendDeletionRequest)
- **Flaw**: This function only logs a mock email to the console. It does not perform any actual data deletion from the system.
- **Danger**: Users might think their data is being deleted when it isn't.
- **Fix**: Implement an actual deletion logic (perhaps flagging the user/agency for deletion) or explicitly state in the UI that this is a manual request that will be processed by an administrator.

## 23. Loose Authorized Check in Auth Config

- **Reference:** `src/auth.config.ts`
- **Flaw**: The `authorized` callback returns `true` by default for all paths.
- **Danger**: Relies exclusively on `RootPage` redirects or per-page auth checks. Any new page without an explicit role check will be accessible to any logged-in user, regardless of their role.
- **Fix**: Implement a strict "deny-by-default" policy. Define protected route patterns (e.g., `/admin/*`, `/agency/*`) and verify the user's role/session within the `authorized` callback before allowing access.
