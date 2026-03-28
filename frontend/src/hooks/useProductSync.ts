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
    const businessId = currentBusiness?.id;
    if (!businessId || isSyncing) return;

    setIsSyncing(true);
    setLastSyncError(null);

    try {
      // 1. Get last sync time from local metadata
      const metadata = await localDb.syncMetadata.get(businessId);
      
      // Check if we actually have any products locally for this business
      const localCount = await localDb.products.where('locationId').equals(businessId).count();
      
      // If we have no local products for this branch, ignore 'since' and do a full sync
      const since = localCount > 0 ? (metadata?.lastSyncedAt || 0) : 0;

      // 2. Fetch changes from server
      const result = await getProductsDeltaAction(businessId, since);

      if (result.success && result.products) {
        // 3. Update local Dexie database
        if (result.products.length > 0) {
          const formattedProducts = result.products.map((p: any) => ({
            ...p,
            locationId: p.branch || businessId, // ⚡️ MAP branch from backend to locationId
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt)
          }));
          await localDb.products.bulkPut(formattedProducts as Product[]);
        }

        // 4. Update sync metadata with CURRENT server time (to prevent clock drift)
        await localDb.syncMetadata.put({
          id: businessId,
          lastSyncedAt: result.serverTime || Date.now()
        });
      } else {
        // Only throw if it's a real error, not a 401 which is handled by auth-guard
        if (result.error && !result.error.includes('401')) {
          throw new Error(result.error || 'Failed to fetch delta updates');
        }
      }
    } catch (error: any) {
      console.error('Product Sync Error:', error);
      setLastSyncError(error.message);
    } finally {
      setIsSyncing(false);
    }
  }, [currentBusiness?.id, isSyncing]); // Depend on ID and isSyncing state

  // Initial sync on mount or business change, plus periodic polling
  useEffect(() => {
    if (!currentBusiness?.id) return;

    // Initial sync
    syncProducts();

    // 🕒 POLLING: Check for updates every 30 seconds
    const interval = setInterval(() => {
      syncProducts();
    }, 30000); 

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness?.id]); // Only re-run when business ID changes

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

export const useLocalProduct = (productId: string | undefined) => {
  return useLiveQuery(async () => {
    if (!productId) return null;
    return await localDb.products.get(productId);
  }, [productId]);
};
