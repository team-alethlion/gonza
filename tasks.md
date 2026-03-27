- proper recipt number generation function
- check for relations
- ensure that only data for that user, agency and branch is downloaded
- permanent deletion (delete data permanately and freeze account: while data gone avoid account duplication-soft delete essentials)
-

- RCP-JAV-2026-00001

Potential Flaws and Inconsistencies:

1.  Sync-Clock Drift: useProductSync uses Date.now() on the client to update
    lastSyncedAt. If a client's clock is ahead of the server's, they might
    miss updates because getProductsDeltaAction uses this timestamp. This is a
    common "Visibility Gap" issue.
2.  Sales Cache Overflow: useSalesData deletes all local sales for a branch
    and replaces them with a full fetch every time. For high-volume branches,
    this could lead to significant performance degradation and unnecessary
    database strain.
3.  No Delta Sync for Sales: While inventory uses a delta sync, sales rely on
    a full refetch of the first 50 records. This creates a "Visibility Gap" if
    a user scrolls down and tries to find older sales that haven't been
    loaded.
4.  Local ID Collision Risk: useSalesData uses id from DbSale, but
    mapSaleToDbSale in types/index.ts (which I saw earlier) sometimes handles
    localId. If a sale is created while offline and then synced, there's a
    risk that the local and server IDs might conflict or lead to duplicate
    entries if not handled carefully.
5.  Race Condition in useSalesData: The loadFromCache function in useSalesData
    logs a message but doesn't actually populate the React Query state. This
    means the UI will always show a skeleton loader until the network request
    completes, even if the data is already available in Dexie.
6.  Unprotected bulkPut: syncProducts uses bulkPut, which overwrites local
    data. If a user makes local changes (like an offline edit) and a sync
    triggers, their local changes might be lost before they can be sent to the
    server.
