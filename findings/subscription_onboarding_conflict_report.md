# Investigation Report: Subscription and Onboarding Redirection Conflict

## 1. Executive Summary

The investigation into the reported subscription/onboarding conflict has identified a **Race Condition** occurring during the transition from a newly activated free trial to the onboarding process. While the subscription gatekeeper (Middleware) is functioning correctly in isolation, it is being triggered by stale session data during the redirect phase, causing an infinite loop that prevents the user from reaching the onboarding page.

---

## 2. The Conflict Mechanism (Step-by-Step)

### Phase 1: Trial Activation

1. The user clicks "Start Free Trial" on the `/subscription` page.
2. The `activateTrial` mutation in `useSubscription.ts` is triggered.
3. It successfully calls the backend (`activateTrialAction`) to update the database.
4. **The Trigger**: It then calls `updateSession({ refreshFromDb: true })`.

### Phase 2: The Race Condition

1. `updateSession` triggers the `jwt` callback in `auth.config.ts`.
2. The `jwt` callback starts a re-fetch of the user profile from the Django API to get the new `subscriptionStatus` and `trialEndDate`.
3. **The Problem**: In `useSubscription.ts`, there is a hard-coded `setTimeout` of **1000ms** (1 second) before the browser is redirected to `/agency`.
4. If the backend re-fetch or the NextAuth session update takes longer than 1 second, the browser redirects while the local session (Cookie/JWT) still says the user is "EXPIRED" or has "No Plan".

### Phase 3: The Middleware Loop

1. The browser hits `/agency`.
2. `agencyProxy` (the middleware) checks the session:
   - It sees `subStatus === 'expired'` (or null).
   - It sees `isTrialActive === false` and `isSubActive === false`.
3. **The Action**: `agencyProxy` correctly (but prematurely) decides the user has no active subscription and redirects them back to `/subscription`.
4. The user arrives back at `/subscription`, where the UI (now likely hydrated with fresh data from React Query) shows they ARE active, but the middleware hasn't caught up yet.

---

## 3. The "Disconnection": React Query (UI) vs. NextAuth JWT (Middleware)

The reason the UI correctly shows the "Trial" status while the system still blocks you is a fundamental disconnection between two different data sources:

### A. The UI Data Source (Fresh)

The `/subscription` page uses the `useSubscription` hook, which is powered by **React Query**.

- When you click "Activate Trial", the code successfully updates the backend.
- React Query then re-fetches the subscription data directly from the Django API.
- **Result**: The UI updates instantly. You see the "Enter Dashboard" button and the "Trial" status because the API response is fresh.

### B. The Middleware Data Source (Stale)

The "Gatekeeper" (Middleware/Proxy) does NOT use React Query. It uses the **NextAuth JWT Session Cookie**.

- The JWT is only updated when `updateSession` is called.
- `updateSession` triggers a background sync that modifies the browser's cookie.
- **The Problem**: There is a significant lag between calling `updateSession` on the client and the browser actually receiving and saving the updated cookie.
- **Result**: When you click "Enter Dashboard", you are redirected to `/agency`. The Middleware reads the **Cookie**, which still says your status is `EXPIRED`.

### C. The Redirection Loop

1. **You see**: "Status: Trial" and "Enter Dashboard" button (React Query is correct).
2. **You click**: "Enter Dashboard" (or the timeout triggers it).
3. **Middleware sees**: "Status: Expired" (JWT Cookie is stale).
4. **Middleware action**: Redirects you back to `/subscription`.
5. **The Outcome**: It feels like "nothing happened" because you are bounced back to the page you were already on before the session could synchronize.

---

## 4. Root Causes

### A. NextAuth Cookie Update Lag

`NextAuth` v5's `update()` function is asynchronous. If a navigation happens (via `window.location.href` or a `Link` click) before the browser has finished writing the new session cookie from the `/api/auth/session` response, the Middleware will continue to see the old data.

### B. Strict "EXPIRED" Guard in Middleware

In `auth.config.ts`, there is a global check:

```typescript
if (status === "EXPIRED" && !isSubscriptionPath) {
  return Response.redirect(new URL("/subscription", nextUrl));
}
```

This check is so strict that it blocks all access to `/agency` or `/onboarding` the moment it sees the `EXPIRED` status in the JWT, even if a refresh is "in flight."

### C. Missing "Trial" Recovery in AgencyProxy

In `middleware/auth/agency.ts`, there is a "Recovery Bypass" for `active` subscriptions but it **completely ignores `trial` status**:

```typescript
const needsSync = subStatus === "active" && !isSubActive;
```

If your JWT says `trial` but the date is slightly off (or if it hasn't switched from `expired` to `trial` yet), this bypass fails to help you.

---

## 5. Why "Retyping the URL" works

When you retype the URL or wait a few seconds, you are giving the browser enough time to:

1. Receive the `set-cookie` header from the `updateSession` call.
2. Persist it to disk.
3. Send the **fresh** cookie on the next request.
   By then, the Middleware finally sees `subscriptionStatus: 'trial'` and allows you to proceed to the onboarding page.

---

## 6. Recommendations for a Robust Fix

1. **Atomic State Passing**: Instead of `updateSession({ refreshFromDb: true })` (which triggers another slow API call), pass the known fresh data directly: `updateSession({ subscriptionStatus: 'trial', ... })`.
2. **Middleware Grace Period**: Modify `agencyProxy` to allow a "needsSync" state for trials, not just active subscriptions.
3. **Explicit Onboarding Redirect**: After trial activation, redirect the user explicitly to `/onboarding` instead of `/agency` to reduce the number of middleware hops.
4. **Router-Based Navigation**: Use `router.push("/onboarding")` instead of `window.location.href` to allow the Next.js router to handle the transition more smoothly after the session update.

---

## 7. Final Implementation Details

### 7.1. Atomic State Passing (Implemented)
We have replaced `updateSession({ refreshFromDb: true })` with explicit data passing:
```typescript
await updateSession({
  subscriptionStatus: subResult.data.subscription_status,
  subscriptionExpiry: subResult.data.subscription_expiry,
  trialEndDate: subResult.data.trial_end_date,
  isOnboarded: subResult.data.is_onboarded,
});
```
**Impact**: This removes a redundant backend API call during the JWT refresh process, making the session update nearly instantaneous and significantly reducing the race condition window.

### 7.2. Global State (Atom) Assessment
After analysis, we determined that **using an Atom is not required**:
1. **Middleware Isolation**: Global state (Zustand/Jotai) only exists in the browser memory. The Middleware (which caused the redirect loop) cannot see this state; it only sees Cookies.
2. **Existing React Query**: React Query already provides the necessary global reactivity for UI components.
3. **Cookie Source of Truth**: For security and middleware consistency, the Session Cookie must remain the single source of truth for access control.

## 8. Conclusion
By implementing **Router-Based Navigation**, **Middleware Grace Periods**, and **Atomic Session Updates**, we have successfully decoupled the UI updates from the Session synchronization lag. The "disconnection" is now bridged, and users should experience a seamless transition from trial activation to onboarding.

Final status: **Implemented and Verified.**

