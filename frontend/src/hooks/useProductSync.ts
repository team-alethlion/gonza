import { useEffect, useState, useCallback } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { localDb } from '@/lib/dexie';
import { getProductsDeltaAction } from '@/app/actions/products';
import { useLiveQuery } from 'dexie-react-hooks';
import { Product } from '@/types';
import { matchProductSearch } from '@/utils/searchUtils';

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
      
      // Check if we actually have any products locally for this business
      const localCount = await localDb.products.where('locationId').equals(currentBusiness.id).count();
      
      // If we have no local products for this branch, ignore 'since' and do a full sync
      const since = localCount > 0 ? (metadata?.lastSyncedAt || 0) : 0;

      // 2. Fetch changes from server
      const result = await getProductsDeltaAction(currentBusiness.id, since);

      if (result.success && result.products) {
        // 3. Update local Dexie database
        if (result.products.length > 0) {
          const formattedProducts = result.products.map((p: any) => ({
            ...p,
            locationId: currentBusiness.id, // ⚡️ ENSURE locationId is saved
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt)
          }));
          await localDb.products.bulkPut(formattedProducts as Product[]);
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
  }, [currentBusiness]); // Dependency on whole currentBusiness to be safe

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
  const { currentBusiness } = useBusiness();

  return useLiveQuery(async () => {
    if (!searchTerm || searchTerm.trim().length < 1) return [];
    
    try {
      // 1. Try branch-specific search first
      if (currentBusiness?.id) {
        const branchProducts = await localDb.products
          .where('locationId')
          .equals(currentBusiness.id)
          .toArray();
        
        const filtered = branchProducts
          .filter(product => matchProductSearch(product, searchTerm));
          
        if (filtered.length > 0) return filtered.slice(0, 20);
      }
      
      // 2. Fallback: Search ALL products (incase locationId isn't fully synced/migrated yet)
      const allProducts = await localDb.products.toArray();
      return allProducts
        .filter(product => matchProductSearch(product, searchTerm))
        .slice(0, 20);
    } catch (err) {
      console.error('Dexie Search Error:', err);
      return [];
    }
  }, [searchTerm, currentBusiness?.id]);
};
