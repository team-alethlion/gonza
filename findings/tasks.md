- proper recipt number generation function
- check for relations
- ensure that only data for that user, agency and branch is downloaded
- permanent deletion (delete data permanately and freeze account: while data gone avoid account duplication-soft delete essentials)
-

- RCP-JAV-2026-00001

### 9. Timezone & "Naive" Datetime Risk

- **The Flaw**: Frontend uses `new Date().toISOString()`, while the backend often uses `timezone.now()`.
- **The Impact**: Discrepancies of a few hours can cause stock adjustments to appear in the "future" or "past" relative to sales, making stock-at-time-of-sale calculations nearly impossible to get right.
- ensuring that
  you do not do bulk updates that might write over code that you should not be
  editing

Implementation Strategy (Safe Path)

To fix this without side effects, I propose a two-pronged approach:

Phase 1: Moving Refresh to the "Headers" Phase (Middleware)

- Move the jwt refresh logic from src/auth.ts to src/auth.config.ts. Since
  proxy.ts (the middleware) uses authConfig, this ensures the token is
  refreshed before the page starts rendering.
- Why this is safe: The refresh logic uses standard fetch and module-level
  locking, which is compatible with the Edge Runtime (used by middleware). By
  refreshing in the middleware, the updated session can be saved to the
  browser via Set-Cookie successfully.

Phase 2: Session Propagation in AppInit

- Modify getInitialAppDataAction to fetch the session once.
- Pass the session object explicitly to getBusinessLocationsAction,
  getAccountStatusAction, and the underlying djangoFetch.
- Update verifyUserAccess and verifyBranchAccess to accept an optional
  pre-fetched session to avoid calling auth() repeatedly.
