# Performance & Visibility Auditing Mandates

## 1. Visibility Gap Prevention
- **The Problem**: UI showing placeholders (dots, skeletons) for data the user already owns because of slow permission-checking fetches.
- **The Protocol**: ALWAYS prioritize "Session-Based Bypasses" for Power Users (Admin/Manager/Superadmin).
- **The Check**: If a component hides data behind a `hasPermission` check, verify if that check can be supplemented by a `user.role` check from the local session to provide zero-lag visibility.

## 2. Request & Render Policing
- **N+1 Detection**: Watch for components that fire individual requests inside a `.map()` or a loop. Warn immediately if a "Batch Fetch" or "Backend Join" is more appropriate.
- **Stable Dependencies**: Monitor `useEffect` and `useMemo` for unstable dependencies (objects/arrays created in-render) that trigger infinite loops.
- **Double-Fetch Audit**: Check if data being fetched is already available in `BusinessContext` or `initialSales`.

## 3. The "Incident Warning" Protocol (CRITICAL)
- **The Rule**: If a performance flaw or logic error is discovered while working on an UNRELATED task, **DO NOT FIX IT** automatically.
- **The Procedure**: 
    1. Complete the requested task.
    2. Add a **[PERFORMANCE ALERT]** or **[LOGIC ALERT]** section to the response.
    3. Explain the found error, the potential impact, and the suggested fix.
    4. Wait for user confirmation before touching the affected code.
- **Goal**: Minimize side-effects and preserve the stability of the current working state.
