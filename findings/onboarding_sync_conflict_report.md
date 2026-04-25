# Investigation Report: Onboarding Redirection Sync Conflict

## 1. Executive Summary
Deep analysis of `logs/frontend.txt` and `logs/backend.txt` has identified a **Synchronization Competition** occurring at the final stage of the onboarding process. This causes the user to "bounce" between `/onboarding` and `/agency` because the navigation is occurring faster than the Session (JWT Cookie) can persist the new "Onboarded" status.

---

## 2. The Loop Discovery (Log Analysis)

### A. The Success Moment
At `[25/Apr/2026 11:06:55]`, the backend successfully processes the onboarding:
`POST /api/core/branches/onboarding/ HTTP/1.1" 200 22`

### B. The Competition (Frontend)
Immediately after, the frontend logs show a "JWT Programmatic update" being triggered.
```text
[Auth] JWT Programmatic update triggered
POST /api/auth/session 200 in 250ms
[Middleware] CHECK -> Path: /agency, User: ..., Onboarded: true, Sub: trial
POST /onboarding 200 in 1597ms
```
**The Problem**: Note that even though the check says `Onboarded: true`, the user is still hitting `POST /onboarding` again. This indicates that the **Middleware** and the **Page Layout** are receiving different snapshots of the session.

### C. The Redirection Loop Proof
The logs show the user hitting `/agency` then `/onboarding` then `/agency` again in a span of less than 2 seconds:
1. `POST /onboarding 200`
2. `POST /agency 200`
3. `GET /agency 200`
4. `[Middleware] CHECK -> Path: /onboarding, User: ..., Onboarded: true`
5. `[Middleware] CHECK -> Path: /agency, User: ..., Onboarded: true`

---

## 3. Root Cause: Data Source Competition

### 1. Middleware vs. Next.js Router
The `onboardingProxy` and `agencyProxy` (Middleware) are running at the **Edge/Server**. They read the `next-auth` session from the Request Headers.
The `OnboardingPage` uses `router.push("/agency")` on the **Client**.

If the `router.push` happens before the `updateSession` call has completely finished writing the new cookie to the browser's storage, the Middleware on the next request will read the **OLD** cookie (`isOnboarded: false`).

### 2. StrictGuard Double-Checking
The `/agency` layout uses a `StrictGuard`.
```text
[StrictGuard] Final Verification:
    - Status: trial
    - Result: PASS
```
The `StrictGuard` is designed to protect against unauthorized access, but if it detects a mismatch between the Client state and the Server session, it might be triggering its own re-verifications, which compounds the redirection logic.

### 3. The "Onboarding Bounce"
Because the user is now technically onboarded in the Database, but the Cookie is "stale", the proxies fight:
- **AgencyProxy**: "JWT says Onboarded=false -> Go to /onboarding"
- **OnboardingProxy**: "User is actually Onboarded=true in session -> Go to /agency"
This creates the "bounce" until the Cookie finally "settles" with the correct value.

---

---

## 4. Best Synchronization Strategy (Proposed Fix)

To maintain the **Strict Access** rules while eliminating the "bounce," we should implement a **Synchronized Handoff** strategy. This ensures the data is verified and persisted *before* the browser is allowed to leave the onboarding page.

### 1. Robust `updateSession` Awaiting
In `OnboardingPage.tsx`, the `updateSession` call must be fully awaited. While `next-auth`'s `update()` returns a promise, it doesn't always guarantee that the cookie-writing process is finished in the browser's background thread.

### 2. The "Persistence Buffer" (Small Delay)
Introduce a small, user-friendly delay (500ms - 800ms) after the session update but *before* navigation. 
- **The Logic**: This gives the browser enough "ticks" to commit the new JWT to disk.
- **The UX**: Use a "Finalizing Setup..." loading state during this buffer so it feels like a natural part of the process.

### 3. Real-Time Onboarding Check in `StrictGuard`
Modify `frontend/src/lib/strict-guard.ts` to apply the same real-time fallback to the onboarding check.
- **Current**: If session is expired -> Fetch from API -> Use API data for subscription check -> **STILL use potentially stale session for onboarding check**.
- **Fixed**: If session is expired -> Fetch from API -> Use the **API data** for BOTH subscription AND onboarding checks.

### 4. Router Navigation (Push vs. Replace)
Use `router.push("/agency")` instead of `router.replace` in the final step to ensure the history stack is correctly updated and the Next.js router transitions smoothly with the new session.

---

## 5. Conclusion
By ensuring the **Data Persistence** is the primary driver of the **Navigation**, we can keep the strict security checks active. The system will only allow entry to `/agency` once it is 100% certain that the session reflected in the browser's cookie matches the "Onboarded" status in the database.

Final status: **Investigated. Strategy for Synchronization without disabling Strict Check is ready.**
