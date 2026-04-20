# Smart History System: Dynamic Event Streaming (Expanded Plan)

## 1. Revision & Problem Solving

During research, three potential flaws were identified in the initial "Virtual Stream" approach:

### A. The "Hard Delete" Void
- **Problem**: If a record (e.g., a Task) is hard-deleted from its primary table, the "Virtual History" logic loses that event forever.
- **Solution**: 
    - Maintain the `activities_activityhistory` table as a **"Shadow Store"**. 
    - Primary tables use dynamic fetching for `CREATE` and `UPDATE` events.
    - `DELETE` events are captured in the Shadow Store via model signals before the record is removed.
    - The Merger will include the Shadow Store as its first source.

### B. Pagination Drift
- **Problem**: Standard `offset` pagination fails when merging multiple tables. If a new Sale is created while a user is on Page 2, the items shift, and the user sees duplicates on Page 3.
- **Solution**: **Seek Pagination (Cursor-based)**. Instead of `offset`, the frontend sends the `last_timestamp` of the last item it saw. Sources will query `created_at__lt=last_timestamp`.

### C. Performance Overhead
- **Problem**: Running 5-10 `COUNT(*)` queries on every page load for "Total Activities" will slow down the UI.
- **Solution**: **Aggregation Caching**. We will use Django's low-level cache to store statistics for 5 minutes, invalidated only by a `POST/PATCH/DELETE` request in those modules.

---

## 2. Expanded Implementation Steps

### Phase 1: The Source Registry (`activities/logic/sources/base.py`)
Create an abstract `BaseHistorySource` class. This ensures every module follows the same contract:
```python
class BaseHistorySource:
    def get_events(self, branch_id, last_timestamp=None, limit=50):
        # Must return List[dict] matching Unified Schema
        pass

    def get_stats(self, branch_id):
        # Must return counts for the aggregator
        pass
```

### Phase 2: Specialized Adapters
- **`sales_source.py`**: 
    - Queries `Sale` where `is_deleted=False`.
    - Queries `InstallmentPayment`.
    - Merges them into `SALES` module events.
- **`inventory_source.py`**:
    - Queries `ProductHistory` where `type` is in `[RESTOCK, ADJUSTMENT, STOCK_TAKE]`.
    - Note: Ignores `type=SALE` as that's handled by `sales_source` to prevent double-logging.
- **`task_source.py`**:
    - Queries `Task` (including those with `parent_task_id`).

### Phase 3: The K-Way Merger (`activities/logic/merger.py`)
This is the core algorithm. It will use Python's `heapq.merge` which is highly efficient for pre-sorted iterables.
1. Call `get_events` on all registered sources.
2. Each source returns 50 items (pre-sorted by DB).
3. `heapq.merge` combines these 500+ items in `O(N log K)` time.
4. Slice the first 50 results for the response.

### Phase 4: Statistical Aggregation (`activities/logic/aggregators.py`)
- **Combined Counts**: Uses `django.db.connection` to run multiple counts in a single round-trip if possible, or parallelizes them at the application level.
- **Top Module**: Calculated by comparing the `COUNT` results of each source.

---

## 3. Data Integrity & Hardening

### Math Hardening for Summaries
- Ensure `Aggregator` uses `Coalesce(Sum('amount'), Value(0))` for any financial history logic to prevent `null` responses.

### Profile Mapping
- To avoid N+1 queries during dynamic fetching, every source adapter MUST use `.select_related('user')`.
- Map `profile_name` in the backend to avoid the frontend doing the lookup.

---

## 4. UI/UX Refinement (Frontend)

- **Decoupled Loading**: The `HistoryClient` will display the List as soon as the Merger returns, while the Summary Cards remain in a skeleton state until the Aggregator finishes.
- **Cursor Logic**: `useActivityHistory.ts` will be updated to store the `timestamp` of the last item for the "Next" button.

---

## 5. Summary of Modules to Create

| Module | Location | Responsibility |
| :--- | :--- | :--- |
| `base.py` | `activities/logic/sources/` | Abstract class and Registry |
| `sales.py` | `activities/logic/sources/` | Sales & Payments adapter |
| `finance.py`| `activities/logic/sources/` | Expenses & Cash adapter |
| `tasks.py` | `activities/logic/sources/` | Task status adapter |
| `merger.py` | `activities/logic/` | K-Way merge implementation |
| `stats.py`  | `activities/logic/` | Cross-table count aggregator |
