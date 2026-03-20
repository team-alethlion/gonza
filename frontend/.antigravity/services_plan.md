# Access Control & Subscription Services Plan

## 1. Current Access Control Conditions

The application currently restricts access based on a combination of User and Agency states, evaluated primarily by the `useOnboarding` hook and enforced by `RequiredSetupGate` and `SubscriptionGate` components.

### 1.1 Evaluated Conditions

- **Authentication:** The user must be authenticated via NextAuth (`session.user` must exist).
- **Onboarding (`isCompleted`):** The user/branch must have completed the initial onboarding setup. If not, they are redirected to `/onboarding`.
- **Account Freeze (`isFrozen`):**
  - Evaluated via `globalStatus?.is_frozen` (from `getAccountStatusAction`) or `onboarding?.is_frozen`.
  - A user is considered frozen if `user.status === 'SUSPENDED'`, `user.status === 'EXPIRED'`, or `user.status === 'INACTIVE'`.
  - If `isFrozen` is true (and days remaining > 0), `RequiredSetupGate` blocks access and shows an "Account Paused due to unusual activity" screen.
- **Subscription / Trial Expiry (`daysRemaining`):**
  - Calculated based on `agency.subscriptionExpiry` or `agency.trialEndDate`.
  - If `daysRemaining <= 0`, `SubscriptionGate` blocks access and forces the user to the renewal/payment screen.

### 1.2 The Gap

The system currently calculates `daysRemaining` _dynamically on the fly_ when a user logs in or when the gate checks the status.
**However, there is no automated background process to transition the state of the `Agency` or `User` in the database when these dates pass.**

If a user doesn't log in, their subscription might expire, but their `user.status` remains `ACTIVE` and `agency.subscriptionStatus` remains `active` or `trial`. While the gates _might_ catch them on their next login based on the date math, relying solely on client-side or on-request evaluation for critical business logic is fragile. It breaks reporting, admin dashboards, and allows API actions to potentially bypass UI gates if not perfectly synchronized.

## 2. Required Services (Cron Jobs)

To ensure the system remains consistent and secure, we need background services to automatically enforce these rules.

### Service 1: Subscription & Trial Monitor (`subscription-monitor`)

**Purpose:** Daily check to update the status of Agencies and Users whose trials or subscriptions have expired.

**Implementation Logic:**

1.  **Find Expired Trials:** Query all `Agency` records where `subscriptionStatus` is 'trial' and `trialEndDate` < `now()`.
2.  **Find Expired Subscriptions:** Query all `Agency` records where `subscriptionStatus` is 'active' and `subscriptionExpiry` < `now()`.
3.  **Update Agency Status:** For the found records, update `subscriptionStatus` to 'expired'.
4.  **Update User Status:** For all users belonging to these expired agencies, update `user.status` to 'EXPIRED'.
5.  **Notify (Optional):** Create an entry in the `SystemNotification` table or trigger an email alerting the agency admin of the expiry.

### Service 2: Impending Expiry Notifier (`expiry-notifier`)

**Purpose:** Daily check to warn users that their trial or subscription is about to end (e.g., 3 days and 1 day before).

**Implementation Logic:**

1.  **Calculate Target Dates:** Determine the dates for `now() + 3 days` and `now() + 1 day`.
2.  **Find Impending Expiring Agencies:** Query `Agency` records where `trialEndDate` or `subscriptionExpiry` falls on these target dates.
3.  **Create Notifications:** Insert records into the `Notification` table targeting the agency admins, prompting them to renew.

### Service 3: Orphaned Account Cleanup (Optional/Future)

**Purpose:** Comply with data retention policies by permanently deleting accounts that have been expired/inactive for a long period (e.g., 90 days).

## 3. Implementation Plan

Since the project uses Next.js (likely deployed on Vercel or similar), standard Node.js cron jobs (like `node-cron`) won't work reliably in serverless environments.

**Recommended Approach: Vercel Cron Jobs (or generic HTTP endpoints triggered by an external scheduler)**

1.  **Create Secure API Routes:**
    - Create `src/app/api/cron/subscription-monitor/route.ts`
    - Create `src/app/api/cron/expiry-notifier/route.ts`
2.  **Secure the Routes:**
    - Require a specific `Authorization: Bearer <CRON_SECRET>` header to ensure these endpoints can only be triggered by your authorized scheduler.
3.  **Implement the Prisma Logic:**
    - Write the complex Prisma queries and `db.$transaction` blocks within these route handlers to perform the state transitions described above.
4.  **Configure `vercel.json` (if using Vercel):**
    - Add a `"crons"` section to schedule these API routes to hit daily at midnight (e.g., `"schedule": "0 0 * * *"`).

---

## 4. ADDITION: Activity Tracking & "Last Seen" Fixes

### 4.1 Problem: Invalid Last Seen Time

Currently, the "Last Seen" logic in the Admin Dashboard is incorrect (often showing "Invalid Time" or using `updatedAt` which only tracks record changes). There is no dedicated field to track when a user was actually moving through the app.

### 4.2 Solution: LastSeen Heartbeat

1.  **Schema Update:** Add `lastSeen DateTime?` to the `User` model in `prisma/schema/auth.prisma`.
2.  **Heartbeat Mechanism:**
    - Create a server action `updateLastSeenAction(userId: string)`.
    - Add a client-side hook `useUserHeartbeat` that calls this action every 5 minutes while the window is focused.
3.  **Admin UI Update:** Update `src/app/actions/admin.ts` to return the `lastSeen` field instead of `updatedAt` for activity monitoring.

### 4.3 Service 4: Activity Cleanup (New Cron)

**Purpose:** Daily maintenance to keep the database lean.
**Implementation Logic:**

1.  **Cleanup Tokens:** Delete all `PasswordResetToken` records where `expires < now()`.
2.  **Cleanup Notifications:** Delete read notifications older than 30 days.
3.  **Identify Stale Users:** Flag users who haven't been "seen" (`lastSeen`) in over 60 days as `INACTIVE`.
