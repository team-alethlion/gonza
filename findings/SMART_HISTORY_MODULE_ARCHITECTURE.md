# Smart History System: Backend Module Architecture

This document identifies all specialized backend modules (Python files) required to implement the dynamic, high-performance "Smart History" system within the `backend/activities/` app.

## 1. Source Adapters (`activities/logic/sources/`)
*Responsibility: Fetching and normalizing data from specific business modules.*

| Module File | Class/Function | Responsibility |
| :--- | :--- | :--- |
| `base.py` | `BaseHistorySource` | Abstract base class defining the `get_events` and `get_stats` interface. |
| `registry.py` | `SourceRegistry` | Singleton class to register and manage all active history sources. |
| `sales_source.py` | `SalesSource` | Fetches `Sale` and `InstallmentPayment` records. |
| `finance_source.py`| `FinanceSource` | Fetches `Expense` and `CashTransaction` (standalone only). |
| `tasks_source.py`  | `TasksSource` | Fetches `Task` status changes and creations. |
| `inventory_source.py`| `InventorySource` | Fetches `ProductHistory` and `StockTransfer`. |
| `customer_source.py` | `CustomerSource` | Fetches `CustomerLedger` financial events. |
| `shadow_source.py`  | `ShadowSource` | Fetches manual logs and **hard-deleted** record data from the `ActivityHistory` table. |

## 2. Processing Engines (`activities/logic/`)
*Responsibility: Algorithmic merging, pagination, and performance.*

| Module File | Responsibility |
| :--- | :--- |
| `merger.py` | **K-Way Merge Engine**: Implements the `heapq.merge` algorithm to combine sorted streams from all adapters into a single 50-item list. |
| `aggregator.py` | **Universal Counter**: Logic to calculate "Total Activities" and "Active Modules" by efficiently summing counts across all source adapters. |
| `cursor.py` | **Seek Pagination**: Utility to encode/decode timestamps into base64 cursors for stable frontend scrolling. |
| `cache_manager.py`| **Response Caching**: Manages Redis/Database caching for the summary cards (5min TTL). |

## 3. System Integration (`activities/`)
*Responsibility: Event capture and API serialization.*

| Module File | Responsibility |
| :--- | :--- |
| `signals.py` | **Data Preservation**: Listens for `pre_delete` signals across all apps to copy record metadata into the `ActivityHistory` (Shadow Store) before deletion. |
| `apps.py` | Updated to initialize the `SourceRegistry` and connect the deletion signals on startup. |
| `views.py` | Updated `ActivityHistoryViewSet` to delegate `list()` to `merger.py` and `stats()` to `aggregator.py`. |
| `serializers.py` | Defines the `UnifiedActivitySerializer` to handle the standard dictionary format returned by the dynamic sources. |

## 4. Implementation Rationale

1. **Isolation of Failure**: If the "Sales" logic has an error, it is contained within `sales_source.py`. The "Finance" or "Tasks" history will continue to work.
2. **Infinite Scalability**: Adding a new module (e.g., "Human Resources") only requires adding one new file in the `sources/` folder and registering it. No core code needs to be modified.
3. **Performance**: Using `heapq` for merging ensures that even if we fetch from 10 different tables, the CPU time required to sort them is minimal (`O(N log K)`).
4. **Data Safety**: The `signals.py` "Shadow Store" ensures that even if a user deletes a task, the history of that task remains visible in the system forever.
