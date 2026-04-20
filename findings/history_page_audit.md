# Activity History Page Deep Audit & Implementation Plan

## 1. Identified Issues

### [PERFORMANCE] Pure Client-Side Hydration
- **Issue**: The `HistoryPage` is a `"use client"` component that fetches data on mount.
- **Impact**: User sees a blank page or spinner for 500ms - 1.5s on every load, even when navigating directly to the URL.

### [PERFORMANCE] Missing Aggregations
- **Issue**: There is no "Stats" or "Summary" endpoint for activities.
- **Impact**: We cannot show high-level trends (e.g., most active module, activity spikes) without fetching and processing the entire list on the client.

### [ORGANIZATION] Core App Bloat
- **Issue**: `ActivityHistory` is sitting in `core_app`, making it harder to maintain and test in isolation.
- **Impact**: Slower build times and potential circular import risks.

---

## 2. Implementation Plan

### Phase 1: Backend Modularization (`activities` app)
1. **Create App**: `mkdir backend/activities`.
2. **Move Model**: Relocate `ActivityHistory` to `activities/models.py`.
3. **Move Serializer**: Relocate `ActivityHistorySerializer` to `activities/serializers.py`.
4. **Move Logic**: Create `activities/logic/stats.py` for backend aggregations.
5. **Move ViewSet**: Relocate `ActivityHistoryViewSet` to `activities/views.py`.
6. **Add Action**: Implement `@action(detail=False, methods=['get']) def stats` in the ViewSet.
7. **Migrations**: Create and apply migrations for the move.

### Phase 2: Frontend Optimization
1. **SSR Conversion**: Turn `history/page.tsx` into a Server Component.
2. **Parallel Prefetch**: Use `Promise.all` to fetch both `activities` and `stats` during SSR.
3. **Hook Refactor**: Update `useActivityHistory.ts` to return data directly from React Query and support `initialData`.
4. **UI Hardening**: Use `formatDate` utility and add skeletons for the stats section.

---

## 3. Targeted Improvements

- **Bulk Cleanup**: Enhance the `activity_cleanup` cron job to be more efficient.
- **Enhanced Search**: Ensure `entity_name` and `description` are indexed for faster lookups.
- **Profile Mapping**: Move `profile_name` calculation to the backend via `annotate` for better performance.
