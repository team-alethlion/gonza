import { useEffect, useState, useCallback } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { localDb } from '@/lib/dexie';
import { getProductsDeltaAction } from '@/app/actions/products';
import { useLiveQuery } from 'dexie-react-hooks';
import { Product } from '@/types';
import { matchProductSearch } from '@/utils/searchUtils';

// 🔒 GLOBAL LOCK: Prevent overlapping syncs across multiple hook instances
let globalSyncLock: string | null = null;

export const useProductSync = (options?: { disableLoop?: boolean }) => {
  const { currentBusiness } = useBusiness();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  // Sync interval from env or default to 30s
  const SYNC_INTERVAL = Number(process.env.NEXT_PUBLIC_PRODUCT_SYNC_INTERVAL) || 30000;

  const syncProducts = useCallback(async (isAuto = false) => {
    const businessId = currentBusiness?.id;
    if (!businessId || isSyncing) return;

    // 🛡️ SYNC LOCK CHECK: If a sync for this business is already in progress globally, skip.
    if (globalSyncLock === businessId) return;

    // 🛡️ TAB VISIBILITY GUARD: If auto-syncing, only proceed if tab is active
    if (isAuto && typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return;
    }

    setIsSyncing(true);
    globalSyncLock = businessId; // Set the lock
    setLastSyncError(null);

    try {
      // 1. Get last sync time from local metadata
      const metadata = await localDb.syncMetadata.get(businessId);
      
      // Check if we actually have any products locally for this business
      const localCount = await localDb.products.where('locationId').equals(businessId).count();
      
      // If we have no local products for this branch, ignore 'since' and do a full sync
      const since = localCount > 0 ? (metadata?.lastSyncedAt || 0) : 0;

      // 🔍 INFORMATIONAL LOGGING: Explicitly tag sync source and parameters
      console.log(`[SyncManager] 🔄 Product Delta Sync: Business=${businessId} Since=${since} Type=${isAuto ? 'AUTO' : 'MANUAL'}`);

      // 2. Fetch changes from server
      const result = await getProductsDeltaAction(businessId, since);

      if (result.success && result.products) {
        // 3. Update local Dexie database
        if (result.products.length > 0) {
          console.log(`[SyncManager] ✅ Applied ${result.products.length} updates for branch ${businessId}`);
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
        // 🛡️ GRACEFUL ERROR HANDLING: Instead of throwing, we set the state and exit.
        // This prevents the console from being flooded with 'fetch failed' stacks during background sync.
        if (result.error && !result.error.includes('401')) {
          const isNetworkError = result.error.includes('fetch failed') || result.error.includes('ECONNREFUSED');
          
          if (isNetworkError) {
            console.warn(`[SyncManager] ⚠️ Product Sync skipped: Backend unreachable (${result.error})`);
          } else {
            console.error(`[SyncManager] ❌ Delta Fetch Failed:`, result.error);
          }
          
          setLastSyncError(result.error);
          return;
        }
      }
    } catch (error: any) {
      // This catch block now only handles unexpected code crashes, not intended fetch failures
      console.error('[SyncManager] ❌ Unexpected Sync Exception:', error);
      setLastSyncError(error.message);
    } finally {
      setIsSyncing(false);
      globalSyncLock = null; // Release the lock
    }
  }, [currentBusiness?.id, isSyncing]); // Depend on ID and isSyncing state

  // Initial sync on mount or business change, plus periodic polling
  useEffect(() => {
    if (!currentBusiness?.id || options?.disableLoop) return;

    // Initial sync (manual/on-mount)
    syncProducts(false);

    // 🕒 POLLING: Check for updates based on configured interval
    const interval = setInterval(() => {
      syncProducts(true);
    }, SYNC_INTERVAL); 

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness?.id, SYNC_INTERVAL, options?.disableLoop]); // Only re-run when business ID changes, interval changes or loop option changes

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
