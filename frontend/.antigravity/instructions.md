# Project Rules

1. **Supabase to Prisma Migration**:
   - **MANDATORY**: Replace all Supabase client calls (`supabase.from(...)`) with Prisma Server Actions.
   - All data fetching and mutations must happen via Server Actions using Prisma.
   - Do not import `supabase` from `@/integrations/supabase/client` in any component or hook.
   - If a corresponding Server Action does not exist in `src/app/[module]/actions.ts`, you MUST create it.
   - Ensure Server Actions return serialized data using the `serialize()` utility.

2. **Server Actions**:
   - Create domain-specific actions in `src/app/[domain]/actions.ts` (e.g., `src/app/sales/actions.ts`).
   - Use `"use server"` at the top of action files.
   - Protect actions using `auth()` from `@/auth`.
   - Actions should handle their own authorization and branch/location context using `getActiveBranch()`.

2. **Authentication and Hooks**:
   - **MANDATORY**: Use `useAuth` from `@/hooks/useAuth` for client-side authentication states.
   - Do NOT use `AuthProvider` or `useAuth` from `@/components/auth/AuthProvider` (legacy paths).
   - If you encounter import errors for `useAuth`, verify you are using the central hook in `src/hooks/useAuth.ts`.

4. **Style and CSS**:
   - Prefer Tailwind classes over CSS-in-JS.
   - For z-index, use `z-10`, `z-50`, `z-100` instead of arbitrary values like `z-[100]` if possible.
   - Use `wrap-break-word` instead of `break-words` if requested by the linting system.

3. **Next.js Navigation**:
   - Use `next/navigation` for all routing (router.push, useParams, etc.).
   - **MANDATORY**: Replace `useNavigate` from `react-router-dom` with `useRouter` from `next/navigation`.
   - **Pattern**: When passing state between routes, use `sessionStorage.setItem('navigation_state', JSON.stringify({ state }))` before `router.push`, as Next.js doesn't natively support state in `router.push`.
   - Use `next/link` for `<Link>` components.
   - Use `"use client"` directive for any file using React hooks.

5. **Offline Storage Management**:
   - **Architecture**: Use `NetworkProvider` for connectivity status and `SyncService` for background synchronization.
   - **Local DB**: Use `Dexie.js` via `src/services/db/local.ts`.
   - **Limits**:
     - **Max Sync Queue Items**: 2000 items. Check with `StorageManager.canAddItems()`.
     - **Max Storage Size**: Browser quota minus 10MB buffer. Check with `StorageManager.getEstimate()`.
   - **Mutations**: ALWAYS use `useOfflineMutation` hook for data-modifying actions (create/update/delete) to ensure offline resilience.
   - **Priority**: Speed and Data Accuracy. Prevent storage overload to maintain application performance.
