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
