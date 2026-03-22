# Synchronization Mandates

## 1. Authentication Locking
- **The Problem**: Simultaneous server actions can trigger "Refresh Storms" if they all detect an expired token at the exact same millisecond.
- **The Protocol**: ALWAYS use a Singleton Promise (e.g., `globalRefreshPromise`) in `auth.ts`.
- **The Rule**: Never allow more than one active `POST /api/auth/token/refresh/` call to be in flight.

## 2. Shared State Guards
- When updating shared contexts (like `BusinessContext`), ensure stable dependency arrays to prevent infinite re-render loops.
- Use `useRef` to track initialization state when data is being hydrated from multiple sources (SSR + Client).

## 3. Sequential vs. Parallel Loading
- Group metadata requests (Locations, Profiles) into concurrent batches using `Promise.all`.
- Keep heavy analytics/calculation requests separate to prevent database connection exhaustion.
