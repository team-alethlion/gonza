# Bug Investigation: "Failed to Load Profiles" Error

## Overview
The user is experiencing a "failed to load profiles" error when logging in or switching to a sub-branch. The error is transient for the "Main Branch" but persistent for any "Sub Branch".

## Potential Root Causes

### 1. Flawed Authorization Logic in `getProfilesAction`
The primary cause appears to be a strict branch mismatch check in `src/app/actions/profiles.ts`.

**Current Logic:**
```typescript
export async function getProfilesAction(branchId: string) {
    const session = await auth();
    // ...
    const userBranchId = (session.user as any).branchId;
    if (userBranchId && userBranchId !== branchId) {
        const role = (session.user as any).role?.toLowerCase();
        if (role !== 'superadmin') throw new Error("Unauthorized: Branch mismatch");
    }
    // ...
}
```

**The Issue:**
* When a user signs up, they are assigned a `branchId` (usually the "Main Branch").
* This `branchId` is stored in the `User` table and populated in the session upon login.
* If the user creates a "Sub Branch", they are the `adminId` (owner) of that branch, but their `session.user.branchId` still points to the "Main Branch".
* When attempting to load profiles for the "Sub Branch", the code sees `userBranchId (Main) !== branchId (Sub)`.
* Since the user's role is "Admin" (not "Superadmin"), it throws an `Unauthorized: Branch mismatch` error.
* This error is caught in `ProfileContext.tsx`, which triggers the toast notification: **"Failed to load profiles"**.

### 2. Incorrect Default Branch Selection
In `src/app/actions/business.ts`, the default branch is mocked based on creation date:

**Current Logic:**
```typescript
export async function getBusinessLocationsAction(userId: string) {
    // ...
    const branches = await db.branch.findMany({
        orderBy: [{ createdAt: 'desc' }, { name: 'asc' }]
    });

    return branches.map((b: any, index: number) => ({
        // ...
        is_default: index === 0, // Mocking is_default
    }));
}
```

**The Issue:**
* The most recently created branch ("Sub Branch") is always marked as `is_default`.
* Upon login, `BusinessContext` automatically selects the "default" branch.
* If the newest branch is a "Sub Branch" and the user is tied to the "Main Branch", the app immediately tries to load profiles for the "Sub Branch" and fails.

### 3. PIN Setup and Profile Selection Flow
The user mentioned skipping PIN setup and being reminded later. This indicates that once they successfully switch to the "Main Branch" (where the `branchId` matches), the profile selection logic works as intended. The "failed to load profiles" error specifically prevents the profile selection overlay from showing for sub-branches.

## Recommended Fixes

1.  **Update Authorization:** Modify `getProfilesAction` to allow access if the user is the `adminId` of the branch, even if their `session.user.branchId` is different.
2.  **Fix Default Branch Logic:** Instead of mocking `is_default` based on `createdAt`, the system should either:
    *   Store a real `is_default` flag in the `Branch` table.
    *   Prefer the branch that matches the user's `branchId` as the default.
3.  **Refine Session Data:** Ensure that "Admin" users who own multiple branches are not strictly tied to a single `branchId` in a way that blocks management of their other locations.

## Summary of Findings for Review
The error is a **logic bug** in the security middleware of the profiles service. It incorrectly treats branch owners as restricted staff members, preventing them from accessing profile data for any branch other than their "home" branch.
