This is an upgraded and structured architectural plan for your application. I have broken down the requirements into **logical states** (the user journey), **implementation modules**, and **security protocols**.

---

### **Part 1: Application Logic States**
To build this systematically, we define the "State" of a user session. This determines what the user sees based on where they are in the lifecycle.

1.  **State: Unauthenticated** (`/auth`)
    *   **Action:** Registration/Login.
    *   **Logic:** Once a user registers, they are assigned the `AGENCY_ADMIN` role and a default `Main Branch` is created in the database.
2.  **State: Onboarding** (`/onboarding`)
    *   **Action:** The Stepper procedure.
    *   **Logic:** A multi-step form collecting phone numbers, "how they found us," and "intended usage." Access to `/(protected)` is blocked until this is marked `complete` in the DB.
3.  **State: Subscription Selection** (`/packages`)
    *   **Action:** Payment for a plan or starting a 14-day trial.
    *   **Logic:** If it’s a new account, the "Free Trial" package is available. Users must select a package to proceed to the dashboard.
4.  **State: Active/Protected** (`/(protected)`)
    *   **Action:** Standard agency operations.
    *   **Logic:** Access allowed only if `subscription_status == active` OR `trial_end_date > now`.
5.  **State: Suspended/Expired**
    *   **Action:** Redirect to `/packages`.
    *   **Logic:** Triggered when the Cron Job marks the account as inactive.
6.  **State: Impersonation (Super Admin Only)**
    *   **Action:** Super Admin "viewing as" an Agency Admin.
    *   **Logic:** A specialized session state where the Super Admin bypasses password requirements to troubleshoot.

---

### **Part 2: Super Admin Side Implementation (`(superadmin)/`)**

**Route Structure:** `app/(superadmin)/superadmin/page.tsx`

| Feature | Implementation Detail |
| :--- | :--- |
| **Global Dashboard** | High-level metrics: Total Agencies, Active Subscriptions, Revenue (PesaPay data), and System Load. |
| **Agency Management** | A list of all Agencies with filters (Active, Trial, Expired, Blocked). |
| **Impersonation (Login As)** | A button on each agency row that generates a "Support Token." This token allows the Super Admin to enter the `/(protected)` route as that user without their password. |
| **Subscription Overrides** | Fields to manually change `trial_end_date`, toggle `is_unlimited_usage`, or `revoke_access` (kill-switch). |
| **Password "Bridge" Reset** | Instead of changing the password, the SA generates a **Temporary One-Time Password (OTP)**. The system flags the account as `needs_password_change: true`. |
| **Package Management** | UI to edit package prices, features, and trial durations (defaults to 14 days). |
| **Kill-Switch (Free Trial)** | A global toggle to disable new free trials if the server is overwhelmed. |

---

### **Part 3: Agency Side Implementation (`(protected)/`)**

**Route Structure:** `app/(protected)/`

*   **Branch Logic:** 
    *   `AGENCY_ADMIN` sees all branches. 
    *   `MANAGER` is filtered by the `branch_id` assigned to them in the database.
*   **Trial Constraints:** In the "Create Branch" logic, add a check: `if (isTrial && branchCount >= 2) throw Error("Upgrade for more branches")`.
*   **The "Impersonation Bar":** If the session contains an `impersonatorId` (meaning a Super Admin is logged in), show a bright top bar: *"You are viewing this account as Super Admin. [Exit Impersonation]"*.

---

### **Part 4: Security & Technical Implementation**

#### **1. Secure Impersonation ("Login As")**
*   **Mechanism:** When the Super Admin clicks "Login As," you update the session (JWT or Cookie) to include the `targetUserId` while keeping the `superAdminId` in the metadata.
*   **Middleware:** The middleware must check if the `superAdminId` is present to allow bypass of the password checks on sensitive pages.

#### **2. PesaPay Mobile Money Integration**
*   **Env Config:** Store `PESAPAY_API_KEY`, `PESAPAY_MERCHANT_ID`, and `PESAPAY_SECRET`.
*   **Flow:** 
    1. User clicks "Pay" on `/packages`.
    2. Backend generates a `PesaPay` checkout URL or triggers an **STK Push** to their phone.
    3. **Webhook:** Create a route `/api/webhooks/pesapay`. When payment is successful, the webhook updates the DB: `subscription_status = 'active'`, `expiry_date = today + 30 days`.

#### **3. Cron Jobs (Subscription Enforcement)**
*   **Schedule:** Run every day at 00:00.
*   **Logic:** 
    ```sql
    UPDATE agencies 
    SET status = 'expired' 
    WHERE (subscription_expiry < NOW() OR trial_expiry < NOW()) 
    AND is_unlimited = false;
    ```
*   **React Hook:** In the `layout.tsx` of `(protected)`, if `user.status === 'expired'`, force a `redirect('/packages')`.

#### **4. Password Reset Protocol**
*   Super Admin sets a dummy password (e.g., `Reset123!`).
*   Database entry: `users.password_reset_required = true`.
*   On login, if `password_reset_required` is true, the user is locked into a `/reset-password` page until they provide a new secure password.

---

### **Part 5: UI/UX Design Direction (Tailwind & Pinterest Style)**

*   **Color Palette:** Professional Dark Navy (`slate-900`) for the Super Admin sidebar to differentiate from the Agency Sidebar (typically White or Light Gray).
*   **The Stepper:** Use **Framer Motion** for smooth transitions between "Personal Info" -> "Usage Intent" -> "Package Choice."
*   **Super Admin View:**
    *   **Cards:** Use `glassmorphism` for stats (Total Revenue, Active Users).
    *   **Tables:** Use `shadcn/ui` Data Table with row actions (Block, Extend Trial, Login As).
    *   **Badges:** 
        *   `<Badge className="bg-green-500">Active</Badge>`
        *   `<Badge className="bg-yellow-500">Trial</Badge>`
        *   `<Badge className="bg-red-500">Expired</Badge>`

### **Missing Implementations to Add:**
1.  **Audit Logs:** Every time a Super Admin "Logins As" or "Resets a Password," log it: `Who`, `Target`, `Timestamp`, `Action`. This protects you legally.
2.  **Rate Limiting:** Protect the payment and login routes from brute force.
3.  **Data Isolation (RLS):** If using PostgreSQL (Supabase/Prisma), ensure Row Level Security is active so that `Branch A` managers can *never* query `Branch B` data even if they guess the ID.


To ensure this application is production-ready, highly secure, and scalable, here are the critical components that were not explicitly mentioned but are **essential** for a SaaS (Software as a Service) platform with a Super Admin architecture.

### 1. Data Isolation (Multi-Tenancy)
Since you have multiple agencies, you must ensure "Data Leaks" never happen.
*   **Tenant ID:** Every table in your database (except Super Admin tables) must have an `agency_id`. 
*   **Global Middleware/Filter:** Ensure that every query made in `(protected)/` automatically filters by the logged-in user's `agency_id`. This prevents a Manager in Agency A from accidentally seeing data from Agency B by guessing a URL ID.

### 2. Audit Logs (The "Paper Trail")
Because the Super Admin has "God Mode" (impersonation, resetting passwords, extending trials), you need a record of their actions for accountability.
*   **Implementation:** A table `audit_logs` that records:
    *   *Who:* (Super Admin ID)
    *   *Action:* (Impersonated User X, Extended Trial for User Y, Reset Password)
    *   *Timestamp:* (When it happened)
    *   *IP Address:* (Where it happened from)
*   **Why:** If an agency claims their data was tampered with, you can prove if it was an internal error or a Super Admin action.

### 3. Notification & Warning System
Currently, you have a "Hard Cut-off" (once the trial ends, they are blocked). This leads to a poor user experience.
*   **Implementation:** 
    *   **In-App Countdown:** A banner in `(protected)/` saying "Your trial expires in 3 days. Upgrade now to avoid interruption."
    *   **Email/SMS Alerts:** Automated messages sent at 7 days, 3 days, and 1 day before expiration.
    *   **Grace Period:** A Super Admin setting to allow a "3-day grace period" after expiration before the account is fully locked.

### 4. Manager Invitation Flow
How does a Manager get into the system?
*   **Implementation:** The Agency Admin should not just "create" a user; they should "invite" them.
    *   Agency Admin enters the Manager's email.
    *   System sends an email with a unique link.
    *   Manager clicks the link, sets their own password, and joins the branch.
*   **Why:** This is more secure than an Admin manually typing a password for a Manager.

### 5. Invoicing and Receipt Generation
Since you are using PesaPay for mobile money, users will need proof of payment.
*   **Implementation:** A small service that generates a PDF receipt/invoice after a successful PesaPay webhook.
*   **Agency View:** A "Billing" tab inside `(protected)/` where they can download past receipts for their own tax records.

### 6. Maintenance Mode (Global Kill-Switch)
If you are pushing a major update that might break the database, the Super Admin needs a way to "Pause" the app.
*   **Implementation:** A toggle in the Super Admin dashboard that puts the `(protected)/` routes into a "System Maintenance" view while allowing the Super Admin to continue testing.

### 7. Resource Usage Tracking
You mentioned "Unlimited Usage" for test accounts. You need to track the *actual* usage for paying accounts.
*   **Implementation:** A "Usage" dashboard for the Super Admin to see which agencies are taking up the most database space or server resources. 
*   **Why:** This helps you decide when to increase package prices or move an agency to a "Private Server."

### 8. Soft Deletes
If an Agency Admin accidentally deletes a branch or a manager, you don't want the data gone forever.
*   **Implementation:** Use a `deleted_at` timestamp instead of deleting rows from the DB. 
*   **Super Admin Power:** Only the Super Admin should have a "Trash" bin to permanently purge data or "Restore" it if an agency makes a mistake.

### 9. Documentation/Knowledge Base
Even with a great UI, users will get lost.
*   **Implementation:** A `(public)/help` or `(public)/docs` route. 
*   **Super Admin Role:** Ability to upload "How-to" videos or articles directly from the Super Admin dashboard that appear on the Agency's dashboard.

### 10. Analytics Dashboard (The "Business" View)
The Super Admin needs to know if the business is growing.
*   **Metrics to include:**
    *   **Churn Rate:** How many people stop paying after the trial?
    *   **Conversion Rate:** % of users who go from Onboarding -> Paid.
    *   **ARPU:** Average Revenue Per User.

### 11. Support Ticket System (Internal)
Instead of agencies emailing you and getting lost in your inbox.
*   **Implementation:** A "Support" button in the Agency dashboard that opens a chat or a ticket. 
*   **Super Admin Side:** A "Tickets" tab to respond to these requests. This ties in perfectly with your "Login As" (Impersonation) feature—you see the ticket, click "View as User," fix the issue, and reply.

### 12. PesaPay Refund Logic
Sometimes a user pays twice by mistake or wants a refund.
*   **Implementation:** A "Refund" button in the Super Admin dashboard that communicates with the PesaPay API to reverse a transaction (if their API supports it) or marks the transaction as "Refunded" in your ledger.

### Summary of Route Structure Additions:
*   `app/(superadmin)/superadmin/audit-logs/page.tsx` -> Track SA actions.
*   `app/(superadmin)/superadmin/support/page.tsx` -> Manage help tickets.
*   `app/(protected)/billing/page.tsx` -> Agency sees invoices/plan status.
*   `app/(public)/maintenance/page.tsx` -> The landing page when the system is down.



To complete the technical design, we need to dive deep into these three pillars. These are the "invisible" features that separate a hobby project from a professional, secure SaaS.

Here is the breakdown of how to implement **Audit Logs**, **Rate Limiting**, and **Data Isolation** within your specific route structure.

---

### 1. Audit Logs (The "Evidence" Trail)
Since your Super Admin has "God Mode" (impersonation and password resets), you need a non-editable record of every high-level action.

**Implementation Plan:**
*   **The Schema:** Create an `AuditLog` table in your database.
    ```prisma
    model AuditLog {
      id          String   @id @default(cuid())
      actorId     String   // ID of the Super Admin
      targetId    String?  // ID of the Agency or User being modified
      action      String   // "IMPERSONATION_START", "PASSWORD_RESET", "TRIAL_EXTENSION"
      metadata    Json?    // Store old_value vs new_value or IP address
      createdAt   DateTime @default(now())
    }
    ```
*   **The Logic:** 
    *   Inside your `(superadmin)/` server actions, every time a function like `extendTrial()` or `impersonateUser()` is called, the **last line** of that function must be a call to `db.auditLog.create()`.
*   **Super Admin View:** Create `app/(superadmin)/superadmin/logs/page.tsx`. This page should only be readable by Super Admins. Use a simple table to show: *"Admin [Name] reset password for Agency [X] on [Date]."*

---

### 2. Rate Limiting (The "Shield")
You must prevent automated scripts from spamming your PesaPay integration or trying to guess passwords.

**Implementation Plan:**
*   **Where to Apply:**
    1.  **Login Route:** Limit to 5 attempts per 15 minutes per IP.
    2.  **PesaPay Callback/Webhook:** Limit to prevent "Double Spend" or server overload.
    3.  **Onboarding Forms:** Prevent bots from creating thousands of "Free Trial" accounts.
*   **Technical Tool:** Use **Upstash Redis** with `@upstash/ratelimit` if you are on Vercel/Next.js, or a simple memory-cache if hosting on a VPS.
*   **Middleware Logic:**
    ```typescript
    // middleware.ts snippet
    if (req.nextUrl.pathname.startsWith('/api/auth')) {
      const { success } = await ratelimit.limit(ip);
      if (!success) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }
    ```

---

### 3. Data Isolation / RLS (The "Vault")
This is the most critical part. A Manager from "Branch A" should never be able to see "Branch B" data, even if they are tech-savvy and try to change the ID in a URL.

**Implementation Plan (The "Tenant-ID" Approach):**
*   **The Schema Change:** Every single table (Products, Sales, Staff, Branches) **must** have an `agencyId` column.
*   **The Prisma Middleware (or Service Layer):** 
    Instead of writing `db.products.findMany()`, create a wrapper function that *always* injects the `agencyId`.
    ```typescript
    // Example of a safe query in (protected)/
    const getBranches = async (userSession) => {
      return await db.branch.findMany({
        where: {
          agencyId: userSession.agencyId, // Forced isolation
        }
      });
    }
    ```
*   **Super Admin Bypass:** In your query logic, add a condition: 
    *   `if (session.role === 'SUPERADMIN')` -> Allow access to all `agencyId`s.
    *   `else` -> Strictly filter by the user's `agencyId`.
*   **URL Protection:** In `(protected)/branch/[id]/page.tsx`, the first line of code should check: `if (branch.agencyId !== currentUser.agencyId) return notFound()`.

---

### 4. Implementation Checklist for Your Specific Routes

#### **A. For `(superadmin)/`**
*   **Implementation:** Create a "Search Agency" bar. When the SA clicks "View Dashboard," set a cookie named `impersonating_agency_id`. 
*   **Security:** Ensure the `impersonating_agency_id` cookie can only be set by someone with the `ROLE_SUPERADMIN`.

#### **B. For `(protected)/`**
*   **Role-Based Access Control (RBAC):**
    *   **Agency Admin:** Access to `/protected/billing` and `/protected/settings`.
    *   **Manager:** Redirected away from `/protected/billing` to their specific branch dashboard.
*   **The "Trial Expired" Interceptor:** 
    Create a high-level layout wrapper for `(protected)`.
    ```typescript
    // (protected)/layout.tsx
    if (agency.status === 'EXPIRED' && !isSuperAdmin) {
       redirect('/packages');
    }
    ```

#### **C. For `(packages)/`**
*   **Logic:** This is the only place a "Blocked" or "Expired" user can go. 
*   **PesaPay Security:** Ensure the `transaction_id` from PesaPay is verified via a server-to-server call before granting access. Never trust the frontend "Payment Successful" message.

---

### Summary of what to do next:
1.  **Update Database:** Add `agencyId` to all entities and create the `AuditLog` table.
2.  **Build the "Bridge" Password Reset:** In `(superadmin)/`, create a button that generates a random string, saves it as the user's password, and sets `forcePasswordChange: true`.
3.  **Implement the Stepper:** In `app/onboarding/page.tsx`, save the data to the Agency profile before allowing them into `(protected)`.
4.  **Cron Job:** Setup a GitHub Action or a Vercel Cron to run a script every midnight:
    `UPDATE Agency SET status='EXPIRED' WHERE trialEndDate < NOW() AND isPaid=false`

**Professional UI Tip:** Since you mentioned Pinterest/Tailwind, for the Super Admin side, use a **Sidebar Layout** with a "Search Command" (CMD+K) so the Super Admin can quickly type an agency name and jump straight to their account.



To design a system where the **Super Admin has total control**, the UI must feel like a "Command Center"—dense with information but highly organized. Below is the breakdown of the UI/UX strategy, the automated logic (Crons), and the interaction patterns.

---

### 1. UI Design Philosophy: The "Command Center" (Super Admin)
While the Agency side (`(protected)/`) should be clean and user-friendly, the Super Admin side (`(superadmin)/`) should focus on **utility, speed, and oversight.**

*   **Color Palette:** Use a "Professional Slate" or "Deep Navy" (`bg-slate-950`) for the Super Admin area to visually distinguish it from the Agency side. This prevents the Admin from forgetting they are in "God Mode."
*   **Visual Hierarchy:** Use **Stats Cards** at the top of the dashboard using `glassmorphism` effects.
    *   *Total Revenue (PesaPay)* | *Active Trials* | *Expiring Today* | *Server Health*
*   **Typography:** Use a monospace font for ID fields and transaction codes (e.g., PesaPay reference numbers) to make them easy to read and copy.

---

### 2. Data Presentation: Tables & Modals
#### **A. The "Power Table" (Agencies/Users)**
Don't just use a basic table. Use a **Data Table** (like `tanstack/table`) with:
*   **Inline Status Badges:** `Trial` (Blue), `Active` (Green), `Expired` (Amber), `Blocked` (Red).
*   **Quick Actions:** A "Three-dot" menu or a hover-action row containing: *Impersonate, Extend Trial, Reset Password, Block.*
*   **Search & Multi-Filter:** Filter by "Package Type," "Signup Date," or "Payment Status."

#### **B. Action Modals (Safety First)**
Since the Super Admin can manipulate critical data, never use direct buttons for "Reset" or "Block." Use **Confirmation Modals**:
*   **Password Reset Modal:** Displays the user’s phone/email for verification, then provides a "Generate Temp Password" button with a "Copy to Clipboard" feature.
*   **Package Override Modal:** A slider or date-picker to manually set a new `trial_end_date`.

---

### 3. Custom Alerts & Global Notifications
*   **The "Impersonation Ribbon":** When a Super Admin is inside an Agency’s `(protected)/` route, a high-contrast **Sticky Top Bar** must appear:
    *   *"Currently Viewing as [Agency Name]. [Exit Impersonation]"*
    *   This prevents the Admin from accidentally performing actions thinking they are in their own account.
*   **Toast Notifications (Sonner/HotToast):** 
    *   **Success:** "Trial extended by 14 days."
    *   **Warning:** "PesaPay Webhook delayed – verify transaction manually."
    *   **Critical:** "Agency [X] has been blocked for suspicious activity."

---

### 4. Cron Jobs: The "Invisible Hand"
Cron jobs (scheduled scripts) handle the automation of your business rules.

#### **A. Subscription Guard (Every Midnight)**
*   **Logic:** Scan `agencies` where `subscription_status == 'active'`.
*   **Action:** If `expiry_date < now`, change status to `expired` and send a "Subscription Ended" notification.
*   **Protection:** The code must check `is_unlimited_usage`. If `true`, the cron ignores this account.

#### **B. Trial Countdown & Alerts (Daily)**
*   **Logic:** Find trials expiring in exactly 3 days.
*   **Action:** Trigger an automated **Email/SMS** ("Your trial ends soon! Upgrade to keep your data.")
*   **Admin Notification:** Alert the Super Admin if a "High-Value" trial (based on onboarding comments) is about to expire.

#### **C. Data Cleanup (Monthly)**
*   **Action:** Archive logs older than 90 days to keep the database fast.

---

### 5. Responsiveness & Adaptive Layouts
*   **Super Admin:** Optimize for **Desktop First**. Super Admins usually work on large monitors to see data tables. Use a collapsible sidebar to maximize table width.
*   **Agency Admin/Manager:** Optimize for **Mobile First**. Managers on the floor of a branch will use phones/tablets.
    *   **Mobile Tables:** On small screens, transform tables into "Cards" so data isn't cut off.
    *   **Touch Targets:** Ensure buttons in the `(protected)/` area are at least 44px tall for easy tapping.

---

### 6. The Stepper Procedure (Onboarding UI)
For the first-time login, the Stepper should be a **Full-Screen Modal** to ensure focus.
1.  **Step 1: Company Profile** (Phone, Address, Logo).
2.  **Step 2: Survey** (How did you hear about us? What is your industry?).
3.  **Step 3: Package Selection** (Show the 14-day trial badge prominently).
4.  **Completion:** Confetti effect + "Go to Dashboard" button.

---

### 7. Implementation Plan (State Breakdown)

| State | Role | UI Route | Key Component |
| :--- | :--- | :--- | :--- |
| **I. Setup** | Developer | `/api/cron` | Edge Functions for daily expiry checks. |
| **II. Control** | Super Admin | `(superadmin)/` | Searchable Agency List + Impersonation Logic. |
| **III. Growth** | Super Admin | `(packages)/` | CRUD for price plans (JSON-based features). |
| **IV. Security** | System | Middleware | RLS (Row Level Security) check on every request. |
| **V. Support** | Super Admin | `(superadmin)/logs` | Audit trail of who changed what and when. |

### Security Recommendation: "The Kill Switch"
Include a **Global Toggle** in the Super Admin dashboard. If you detect a security breach or a PesaPay API failure, you can "Pause All Transactions" or "Disable New Signups" with one click. This gives the Super Admin "Total Control" in emergency situations.