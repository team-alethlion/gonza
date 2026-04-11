# Security Investigation: Hardcoded Role-Based Permission Bypass (Deep Dive)

## 1. Objective

Investigate the reported hardcoded role-based permission bypasses in `useFinancialVisibility.ts` and `ProfileContext.tsx` to assess the security risk and verify if the flaw persists in the current codebase.

## 2. Technical Findings (Fact-Based)

### 🚨 Confirmed: The "Power User" Logic

The frontend uses a two-tier bypass system that overrides granular database permissions:

1.  **UI Level (`useFinancialVisibility.ts`)**:

    - Uses the `user.role` string from the auth session.
    - **Hardcoded Roles**: "admin", "manager", "superadmin".
    - **Impact**: These roles get `true` for every financial visibility flag, regardless of what the `hasPermission` check returns.

2.  **Context Level (`ProfileContext.tsx`)**:
    - The `hasPermission` function (line 268) checks `currentProfile.role` and `business_role.name`.
    - **Hardcoded Roles**: "admin", "manager", "owner".
    - **Impact**: If a profile has one of these names, the function returns `true` immediately. This renders the `permissions` map (fetched from the DB) entirely irrelevant for these accounts.

### 🔐 PIN Bypass Vulnerability

- `ProfileContext.tsx` (line 85) automatically sets `isProfileVerified = true` for Admin/Manager/Owner roles.
- **Fact**: Owners and Admins never have to enter their PIN to access sensitive dashboard data, even if a PIN is set. This is a significant security hole if a device is left unattended.

### 📡 Auth Layer & Tampering Risk

- `user.role` is populated in `frontend/src/auth.ts` during the `authorize` callback.
- It extracts `user.role?.name` from the Django `/me/` response and places it in the JWT.
- **Fact**: Since the frontend relies on this string for permissions, any compromise of the NextAuth secret or session hijacking allows an attacker to escalate privileges by simply changing the `role` string in the session.

### 🛡️ Backend Discrepancy

- The Django backend has a robust `Role` and `Permission` model structure.
- **Fact**: The backend does **not** appear to have these hardcoded strings in its core logic. It is purely the frontend providing "shortcuts" for convenience.

## 3. Recommended Security Hardening

### 🚀 Recommendation 1: Unified Permission Check

Remove all role-string checks (`admin`, `manager`, etc.) from `useFinancialVisibility.ts` and `ProfileContext.tsx`.

- The `hasPermission` call should be the **only** way to check access.
- If an Admin needs full access, the system should ensure the "Admin" role in the database is populated with all permission flags.

### 🚀 Recommendation 2: Zero-Bypass PINs

Remove the role-based PIN bypass. Security should be applied uniformly. If an Admin wants PIN protection, it should actually protect their account.

### 🚀 Recommendation 3: Server-Side Enforcement

The Django backend must be updated to check the `Permission` table for sensitive actions (e.g. viewing costs, deleting sales) rather than just checking `IsAuthenticated`.

## 4. Conclusion

The "convenience" of hardcoded roles has created a significant security debt. The current frontend implementation effectively bypasses the structured permission system for all high-level accounts, making it impossible to restrict an Admin or Manager's access via the database.
