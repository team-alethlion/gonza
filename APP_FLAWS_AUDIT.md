1. The "Category Storm" (Critical Redundancy)
   In your backend logs between 07:48:19 and 07:48:21, the endpoint
   api/sales/categories/ was hit 4 times in 2 seconds.

   - The Cause: It appears that multiple independent components (the Sales
     Table, the Filter Dropdown, and likely a "New Sale" or "Edit" dialog) are
     all calling a useSaleCategories hook simultaneously.
   - The Impact: Every time a user opens the sales list, your server does 4x
     more work than necessary to fetch a list that rarely changes.

2. The "History Double-Fetch"
   The api/core/activity-history/ endpoint was hit 2 times (07:48:20 and
   07:48:22).

- The Cause: This is likely used to track "Deleted Sales" or audit logs.
  Having two identical requests indicates that two different parts of the UI
  are asking for the same audit trail independently.

3. Missing SSR Optimization
   I noticed that GET /api/sales/sales/ (the actual list of sales) is firing
   after the page loads (at 07:48:16).

- The Observation: Unlike the Dashboard, the Sales Page doesn't seem to be
  "Pre-filling" the data during Server-Side Rendering (SSR). This is why the
  user might see a loading spinner for a moment before the data appears.

4. Investigation Verdict: The "Level Up" opportunity
   The Sales page is currently using the "Independent Component" architecture
   that we just fixed on the Dashboard. Each widget is "waking up" and firing its
   own API calls.

Recommended Strategy:

1.  Consolidate Categories: We should use React.cache or a "Hydration Guard"
    on the Sale Categories fetch so that the 4 calls become 1.
2.  SSR for Sales: We should "Level Up" the initial sales fetch to the
    page.tsx so the table is populated instantly.
3.  Harden Activity History: Add a hydration guard to the audit log fetch.
