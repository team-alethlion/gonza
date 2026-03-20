import { useEffect, useState, useCallback } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { localDb } from '@/lib/dexie';
import { getProductsDeltaAction } from '@/app/actions/products';
import { useLiveQuery } from 'dexie-react-hooks';

export const useProductSync = () => {
  const { currentBusiness } = useBusiness();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const syncProducts = useCallback(async () => {
    if (!currentBusiness?.id) return;

    setIsSyncing(true);
    setLastSyncError(null);

    try {
      // 1. Get last sync time from local metadata
      const metadata = await localDb.syncMetadata.get(currentBusiness.id);
      const since = metadata?.lastSyncedAt || 0;

      // 2. Fetch changes from server
      const result = await getProductsDeltaAction(currentBusiness.id, since);

      if (result.success && result.products) {
        // 3. Update local Dexie database
        if (result.products.length > 0) {
          await localDb.products.bulkPut(result.products);
        }

        // 4. Update sync metadata with CURRENT server time (or just now)
        await localDb.syncMetadata.put({
          id: currentBusiness.id,
          lastSyncedAt: Date.now()
        });
      } else {
        throw new Error(result.error || 'Failed to fetch delta updates');
      }
    } catch (error: any) {
      console.error('Product Sync Error:', error);
      setLastSyncError(error.message);
    } finally {
      setIsSyncing(false);
    }
  }, [currentBusiness?.id]);

  // Initial sync on mount or business change
  useEffect(() => {
    const timer = setTimeout(() => {
      syncProducts();
    }, 0);
    return () => clearTimeout(timer);
  }, [syncProducts]);

  // Expose sync status and manual trigger
  return {
    isSyncing,
    lastSyncError,
    syncProducts
  };
};

export const useLocalProductSearch = (searchTerm: string) => {
  return useLiveQuery(async () => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    
    const term = searchTerm.toLowerCase().trim();
    
    // Efficient search in local IndexedDB
    // Note: Dexie startsWith is faster than a full scan
    return await localDb.products
      .where('name').startsWithIgnoreCase(term)
      .or('barcode').equals(term)
      .or('itemNumber').startsWithIgnoreCase(term)
      .or('category').startsWithIgnoreCase(term)
      .limit(20)
      .toArray();
  }, [searchTerm]);
};
