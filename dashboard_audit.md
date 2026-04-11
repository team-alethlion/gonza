---
## 2. Sales Goal Tracker Investigation
...

---

## 3. Security & Visibility Findings

### 🛡️ Permission Bypass Risk

...

### 🛡️ Hardcoded Role-Based Permission Bypass

In both `useFinancialVisibility.ts` and `ProfileContext.tsx`, permissions are completely bypassed if the user role is "admin", "manager", or "owner".

- **The Flaw**: This makes the granular permissions system irrelevant for these roles and creates a security risk if role strings can be manipulated in the client-side session.

---

## 4. General Dashboard Performance

### 📡 Data Fetching Efficiency

...

### 🗄️ Offline Sync & Accuracy

...

## 5. Summary of Risks

1. **Misleading Totals**: Showing totals based on the "last 50 sales" instead of the whole history.
2. **Inaccurate Charts**: Performance charts showing partial sales vs full expenses.
3. **Financial Inconsistency**: Frontend-calculated totals sent to backend (Drift risk).
4. **Goal Ambiguity**: Dashboard showing only one of multiple active goals.
5. **Privilege Escalation**: Role-based permission "shortcuts" in the UI and Context.
6. **Payload Bloat**: Fetching full sale objects for simple dashboard counts.
