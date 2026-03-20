# Package & Subscription Management Implementation Plan

This document outlines the full implementation strategy for integrating the `Package` model into the application, covering onboarding, billing, admin management, and quota enforcement.

## 1. Onboarding Integration (The Final Step)

### 1.1 Objective
Require users to select a subscription package before completing the onboarding process.

### 1.2 Implementation Steps
1.  **Update `src/pages/Onboarding.tsx`:**
    *   Convert the onboarding form into a multi-step wizard. Step 1: Business Details. Step 2: Package Selection.
    *   Fetch active packages from the database (`isActive == true`).
    *   **UI/UX:** Display packages side-by-side using cards showing `name`, `monthlyPrice`, `maxUsers`, `maxProducts`, and `trialDays`.
    *   **Empty State:** If no packages are returned from the DB, display a fallback error: "No subscription packages available. Please contact support." and prevent completion.
    *   **Selection Logic:**
        *   When a user selects a package with `hasFreeTrial == true`, invoke an action to save the business details, link the `packageId`, set `subscriptionStatus` to `'trial'`, set `trialEndDate`, and mark onboarding as complete. Redirect to Dashboard.
        *   When a user selects a package with `hasFreeTrial == false`, save business details, link `packageId`, set `subscriptionStatus` to `'expired'`, mark onboarding as complete. Redirect to Dashboard (which will instantly trigger the `SubscriptionGate` forcing them to pay).

2.  **Update `src/app/actions/business-settings.ts`:**
    *   Update `upsertBusinessSettingsAction` to accept a `packageId`.
    *   Update the associated `Agency` record with the selected `packageId` and trial dates during the initial setup.

## 2. Billing & Public Payment Routes (Upgrades/Downgrades)

### 2.1 Objective
Allow users to view their current package, see available alternatives, and securely upgrade or downgrade.

### 2.2 Implementation Steps
1.  **Update `src/app/(agency)/billing/page.tsx`:**
    *   Add a new section: **"Available Plans"**.
    *   Fetch all active packages. Highlight the user's current package based on `currentBusiness.packageId`.
    *   Add "Upgrade" / "Downgrade" / "Switch Plan" buttons on the other packages.
2.  **Update `src/app/actions/billing.ts`:**
    *   Modify `initiateSubscriptionPaymentAction` to accept an optional `newPackageId`.
    *   If `newPackageId` is provided, verify it exists and use *its* pricing for the Pesapal order instead of the current agency package.
    *   Save `newPackageId` in the pending `Transaction` record.
3.  **Update `src/lib/pesapal.ts`:**
    *   In `processSuccessfulSubscription`, check if the completed `Transaction` has a `packageId`.
    *   If it does, update the `Agency` record with this new `packageId` alongside extending the `subscriptionExpiry`. This handles the upgrade/downgrade finalization.

## 3. Super Admin Management (CRUD)

### 3.1 Objective
Allow platform administrators to create, read, update, and deactivate packages.

### 3.2 Implementation Steps
1.  **Create `src/app/actions/packages.ts`:**
    *   Implement Server Actions: `getPackagesAction`, `createPackageAction`, `updatePackageAction`, `togglePackageStatusAction`.
2.  **Create UI in `src/app/(admin)/packages/page.tsx`:**
    *   **List View:** A table showing all packages, their pricing, quotas, and active status.
    *   **Creation Form:** Inputs for Name, Pricing (Monthly/Yearly), Quotas (Users, Products, Sales, Customers), and Trial Settings.
    *   **Empty State:** "No packages defined. Create one to allow users to onboard."
3.  **Update Admin Navigation:**
    *   Add a link to the "Packages" management page in the sidebar of `src/app/(admin)/components/AdminDashboardClient.tsx`.

## 4. Quota Enforcement (The Gatekeeper)

### 4.1 Objective
Strictly enforce the limits defined by the user's active package across the application to prevent abuse.

### 4.2 Implementation Steps
Create a centralized utility `src/lib/quota-check.ts` with functions like `checkUserQuota(agencyId)`, `checkProductQuota(agencyId)`, etc.

Integrate these checks into the existing Server Actions:
1.  **Users/Profiles (`src/app/actions/profiles.ts`):** 
    *   In `createProfileAction`, count existing users for the agency. If `count >= package.maxUsers` (and `!package.unlimitedUsers`), throw an error: "User limit reached for your current plan. Please upgrade."
2.  **Products (`src/app/actions/products.ts`):**
    *   In `createProductAction`, check against `package.maxProducts`.
3.  **Sales (`src/app/actions/sales.ts`):**
    *   In `createReceiptAction`, check the number of sales made in the current month against `package.maxSalesPerMonth`.

## 5. Automated Services & Cron Jobs

### 5.1 Objective
Ensure the automated services respect package quotas and lifecycles.

### 5.2 Implementation Steps
*   **Existing Crons:** The previously implemented `subscription-monitor` already correctly handles transitioning accounts to `EXPIRED`. No new cron jobs are strictly required for the package system itself.
*   **Database Seeding (`prisma/seed.ts`):**
    *   Update the seed script to automatically generate 3 default packages (e.g., Starter, Pro, Enterprise) so that fresh deployments do not hit the onboarding empty state block.

---
## Summary of Files to Modify/Create

**Modify:**
- `src/pages/Onboarding.tsx`
- `src/app/actions/business-settings.ts`
- `src/app/(agency)/billing/page.tsx`
- `src/app/actions/billing.ts`
- `src/lib/pesapal.ts`
- `src/app/(admin)/components/AdminDashboardClient.tsx`
- `src/app/actions/profiles.ts`
- `src/app/actions/products.ts`
- `src/app/actions/sales.ts`
- `prisma/seed.ts`

**Create:**
- `src/app/actions/packages.ts`
- `src/app/(admin)/packages/page.tsx`
- `src/lib/quota-check.ts`