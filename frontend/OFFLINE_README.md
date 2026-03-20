# Offline-First Architecture

The Gonza Client is built with an offline-first architecture to ensure business continuity even during network interruptions.

## Core Components

### 1. NetworkProvider
Wraps the application and tracks connectivity status.
- **Location**: `src/shared/providers/NetworkProvider.tsx`
- **Context**: Provides `online` (boolean), `quality` ('good'|'poor'|'offline'), and `latency`.

### 2. Local Database
Uses `Dexie.js` (IndexedDB wrapper) to persist data locally.
- **Location**: `src/services/db/local.ts`
- **Tables**: 
  - `syncQueue`: Stores actions that need to be synced when online.
  - `cache`: Stores processed data for offline viewing (optional usage).

### 3. SyncService
Background service that processes the `syncQueue`.
- **Location**: `src/services/syncService.ts`
- **Behavior**: Listens for `online` event and retries pending actions.

### 4. useOfflineMutation Hook
Wraps server actions to provide automatic offline queuing.
- **Location**: `src/hooks/useOfflineMutation.ts`

## How to Usage

### 1. Using `useOfflineMutation`
Replace standard async calls or `useMutation` with `useOfflineMutation` when you want an action to be resilient.

```tsx
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { createCustomerAction } from '@/app/actions/customers';

export function CreateCustomerForm() {
    const { mutate, isLoading, isOnline } = useOfflineMutation({
        actionName: 'createCustomer', // Must be unique
        mutationFn: createCustomerAction,
        onSuccess: (data, variables, context: any) => {
            if (context.isOffline) {
                toast("Saved offline. Will sync later.");
            } else {
                toast("Customer created!");
            }
        }
    });

    const onSubmit = (data) => {
        mutate(data);
    };
}
```

### 3. Monitoring Network Status
Use the `useNetworkStatus` hook to show UI indicators.

```tsx
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const { isOnline, quality } = useNetworkStatus();

if (!isOnline) return <Badge>Offline Mode</Badge>;
if (quality === 'poor') return <Badge variant="warning">Slow Connection</Badge>;
```

### 4. Storage Management
Use the `useStorageStats` hook to monitor local storage usage.

```tsx
import { useStorageStats } from '@/hooks/useStorageStats';

const { stats, formatBytes } = useStorageStats();

if (stats) {
    console.log(`Used: ${formatBytes(stats.usage)} (${stats.percentUsed.toFixed(1)}%)`);
    console.log(`Pending Items: ${stats.itemCount}`);
}
```

The system enforces limits to prevent performance degradation:
- **Max Items**: 2000 queue items
- **Max Storage**: Browser quota - 10MB buffer

### 5. Administration
An admin interface is available at `/admin/offline-storage` to:
- Monitor real-time storage usage and queue status.
- Manually trigger synchronization.
- View details of failed or pending actions.
- Retry failed actions or delete specific items from the queue.
- Clear the entire queue or local storage if necessary.

## Best Practices
- **Optimistic UI**: When `useOfflineMutation` returns success in offline mode, update the UI immediately as if the action succeeded.
- **Idempotency**: Ensure server actions are idempotent where possible, as retries might happen.
- **Feedback**: Always inform the user if their data is "Saved offline" vs "Saved to server".
