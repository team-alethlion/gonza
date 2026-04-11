# Gonza Dashboard & Sales Tracker Audit Findings

## 1. Analytics & Data Accuracy (Resolved)

### ✅ Fixed: Partial Data Hazard
- **The Issue**: Previously, the dashboard calculated "Instant" totals using only the 50 items in memory.
- **Resolution**: Removed client-side aggregations in `useAnalyticsData.ts`. The dashboard now trusts the backend summary as the sole source of truth. UI shows loading states until full-database facts arrive.

### ✅ Fixed: Misleading Performance Charts
- **The Issue**: Charts were previously based on partial sales lists, causing incorrect trends for larger businesses.
- **Resolution**: Implemented a new `performance_chart` endpoint in the backend. The chart now fetches its own aggregated time-series data from the entire database.

---

## 2. Sales Goal Tracker Investigation

### ⏳ Opportunity: N+1 Query Pattern
Every time a user switches tabs (Daily/Weekly/Monthly), the component triggers **two separate network requests**:
1. `getSalesGoalAction` (to get the target)
2. `getPeriodSalesAction` (to get the current progress)
- **The Risk**: This increases latency and server load.
- **Recommendation**: The backend should provide a single endpoint that returns both the goal and the current progress for a specific period.

### 🎯 Ambiguous Goal Selection Logic
In `backend/core_app/logic/analytics.py`, the system fetches only ONE "activeGoal" for the overview.
- **The Flaw**: It prioritizes the monthly goal. If a user has both a "Daily" and a "Weekly" active goal, only one is shown.
- **Recommendation**: The backend should return a list of all active goals for the location, or the frontend should allow the user to choose which one to pin.

---

## 3. Security & Visibility Findings

### 🛡️ Hardcoded Role-Based Permission Bypass
In both `useFinancialVisibility.ts` and `ProfileContext.tsx`, granular permissions are completely bypassed if `user.role` is "admin", "manager", or "owner".
- **The Risk**: This makes the structured permissions system irrelevant for these roles. If a client-side session is tampered with (e.g. changing a role string in local storage), a user could escalate their privileges to view sensitive financial data.
- **Recommendation**: Transition to strict permission-only checks. If a role is "admin", the backend should ensure that profile is assigned all relevant permission flags rather than the frontend using "if admin" logic.

---

## 4. General Dashboard Performance

### 📡 Data Fetching Efficiency (Payload Bloat)
- **The Issue**: `useDashboardData.ts` fetches full `sales` objects (with nested `items`) just to count them in the frontend for some dashboard indicators.
- **The Relationship**: The backend analytics summary already provides counts for paid vs pending sales.
- **Recommendation**: Stop fetching full Sale objects for the dashboard overview. Rely strictly on the summary object. Use the `recentSales` list from the summary for the table instead of a separate full-list fetch.

### 🗄️ Offline Sync & Accuracy
The system saves the analytics summary into Dexie (`localDb.dashboardAnalytics`). 
- **The Risk**: If the local cache is out of sync with the server (e.g. data was deleted from another device), the dashboard will show stale data until a background refresh completes. 
- **Current Mitigation**: A 60-second hydration check is in place, but schema changes (adding new fields) can cause blank columns if the cache is not versioned or cleared.

## 5. Remaining Risks
1. **Financial Inconsistency**: Frontend still calculates some totals before sending to backend (`mapSaleToDbSale`). (Drift risk).
2. **Goal Ambiguity**: Overview showing only one of multiple active goals.
3. **Privilege Escalation**: Role-based "shortcuts" instead of strict permission flags.
4. **Network Overhead**: Multiple redundant requests in the Goal Tracker and Dashboard loader.
