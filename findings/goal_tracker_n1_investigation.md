# Sales Goal Tracker: N+1 Query Pattern & Performance Investigation

## 1. Objective
Investigate the efficiency of data fetching in the `SalesGoalTracker` component, specifically focusing on the reported N+1 query pattern (multiple requests per tab switch) and potential backend/frontend logic redundancies.

## 2. Technical Findings

### 🚨 Confirmed: Double Network Hit on Tab Switch
The `SalesGoalTracker.tsx` component uses two independent `useQuery` hooks that are triggered simultaneously every time the `selectedGoalType` (Daily, Weekly, Monthly) or the `currentPeriod` changes.

1.  **Request 1 (`sales-goal`)**:
    *   **Action**: `getSalesGoalAction`
    *   **Backend URL**: `sales/goals/?branchId={id}&period_name={periodId}`
    *   **Purpose**: Fetches the target amount defined by the user for that specific period.
2.  **Request 2 (`current-period-sales`)**:
    *   **Action**: `getPeriodSalesAction`
    *   **Backend URL**: `sales/sales/period_aggregate/?branchId={id}&startDate={start}&endDate={end}`
    *   **Purpose**: Calculates the actual sales sum from the database for the same period.

**Impact**:
*   **Latency**: The UI must wait for two separate round-trips to the server (Next.js Server Actions) which then perform two separate round-trips to the Django API.
*   **Server Load**: The Django backend processes two requests, performs two separate database queries (one on `SalesGoal` table, one on `Sale` table aggregation), and returns two separate JSON payloads.

### 🔄 Data Format Discrepancies
*   The `SalesGoal` model in the backend actually has a `current_amount` field (calculated via signals or background tasks).
*   However, the frontend **ignores** this backend-calculated `current_amount` and instead triggers a separate aggregation query (`period_aggregate`) to get the "Current Sales".
*   **Risk**: If the `SalesGoal.current_amount` in the DB is out of sync with the actual sales aggregation, the user might see different numbers in different parts of the app.

### 📡 Redundant Fetching vs. Dashboard Summary
*   The `AnalyticsDashboard` already fetches a `summary` via `useAnalyticsData` which contains `activeGoal`.
*   The `SalesGoalTracker` receives this `initialGoal` but **only uses it for the 'monthly' view** as `initialData`.
*   Switching to 'Daily' or 'Weekly' completely ignores the data we might already have or could have fetched in bulk.

## 3. Recommended Optimization Strategy

### 🚀 Recommendation 1: Unified "Goal Progress" Endpoint
The backend should provide a single endpoint (e.g., `sales/goals/progress/`) that accepts a period and returns a unified object:
```json
{
  "goal_id": "...",
  "target_amount": 5000000,
  "actual_amount": 3200000,
  "percentage": 64.0,
  "remaining": 1800000,
  "period": "WEEKLY",
  "label": "Week of Oct 12"
}
```
This reduces the frontend to **one server action** and **one network request**.

### 🚀 Recommendation 2: Enhanced Analytics Summary
Update the backend's `get_analytics_summary` (in `analytics.py`) to return a map of goals instead of just one:
```json
"goals": {
  "daily": { ... },
  "weekly": { ... },
  "monthly": { ... }
}
```
If the dashboard fetches all three goals in the initial summary, switching tabs becomes **instant** (zero network requests) because the data is already in the `summary` state.

## 4. Conclusion
The current implementation is functional but inefficient. It follows an "N+1" behavior where switching between 3 tabs results in 6 network requests. By unifying the data source in the backend summary or a single progress endpoint, we can improve dashboard responsiveness by ~50-70% for these specific cards.
