# Research: Session Guard & Middleware Overhead

## 1. Problem Identification
The logs reveal a redundant re-verification loop happening on almost every protected request:

```log
[StrictGuard] Session stale (expired). Re-verifying via djangoFetch for user us-dbyi92...
[StrictGuard] API Re-verification: Status=active, Valid=true
[StrictGuard] Final Verification: - Status: active - Result: PASS
```

## 2. Root Cause Analysis (Deep Dive)

### A. Session/Backend Desynchronization
**Deep Evidence**: The `StrictGuard` in `frontend/src/lib/strict-guard.ts` runs on the server (during Next.js SSR or Server Actions). It checks the `subscriptionExpiry` stored in the NextAuth session. If expired, it performs a real-time `djangoFetch('/users/users/me/')`.

### B. The Persistence Gap
**Deep Evidence**: Analysis of `frontend/src/auth.config.ts` shows that the NextAuth session JWT only updates its subscription status if `trigger === "update"` is called explicitly from the client, or during a background sync interval. 
When `strict-guard.ts` performs its fallback check and finds the user is "active", it returns the user and allows the page to load, but **it has no mechanism to mutate the NextAuth JWT cookie** from that context. Consequently, the NextAuth session remains "stale", and the very next request triggers the exact same fallback check.

### C. Impact on Latency
This adds a mandatory, blocking 100-200ms API call to Django before *any* page can render on the server, entirely negating the performance benefits of JWT session caching.

## 3. Recommended Optimization Strategy & Implementation

### The "Client-Side Sync Trigger" Pattern
Since `strict-guard.ts` cannot easily write the NextAuth cookie during a read-only server render, we must delegate the update to the client.

1. **Signal the Client**: Modify `strict-guard.ts` to attach a specific header or pass a prop down to the Layout indicating that the session is desynchronized.
2. **AuthUpdater Component**: Create a tiny, invisible client component `<SessionSyncTrigger />` that listens for this signal.
3. **Trigger Update**: If the signal is present, the client component calls the NextAuth `useSession().update({ refreshFromDb: true })` method. 
4. **Result**: The client sends a specific request to the NextAuth API route, which correctly re-fetches the data and **rewrites the JWT cookie**. Subsequent requests will now see the fresh `active` status in the JWT and bypass the `StrictGuard` fallback check entirely.

### Grace Periods
To prevent spamming the update endpoint during navigation, implement a 5-minute debounce lock in `auth.config.ts` using the `lastStatusSync` timestamp.
