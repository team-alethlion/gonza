/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from 'react';
import { localDb, PendingSale } from '../lib/dexie';
import { bulkSyncSalesAction } from '@/app/actions/sales';
import { useToast } from '@/hooks/use-toast';

export const useOfflineSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const syncPendingSales = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;

    try {
      const pending = await localDb.pendingSales
        .where('status')
        .anyOf(['pending', 'failed'])
        .toArray();

      if (pending.length === 0) return;

      setIsSyncing(true);
      console.log(`[OfflineSync] Attempting to sync ${pending.length} pending sales in bulk...`);

      const payload = pending.map(p => ({
        localId: p.id!.toString(),
        saleData: p.saleData,
        branchId: p.branchId,
        userId: p.userId
      }));

      const result = await bulkSyncSalesAction(payload);

      if (result.success) {
        if (result.processed) {
          for (const p of result.processed) {
            await localDb.pendingSales.delete(Number(p.localId));
            console.log(`[OfflineSync] Successfully synced sale: ${p.receiptNumber}`);
          }
        }
        if (result.errors) {
          for (const e of result.errors) {
            const original = pending.find(x => x.id?.toString() === e.localId);
            await localDb.pendingSales.update(Number(e.localId), {
              status: 'failed',
              error: e.error,
              retryCount: (original?.retryCount || 0) + 1
            });
            console.error(`[OfflineSync] Failed to sync sale ${e.localId}:`, e.error);
          }
        }
      } else {
        throw new Error(result.error || 'Bulk sync failed');
      }
    } catch (error: any) {
      console.error('[OfflineSync] General sync error:', error);
      toast({
        title: "Sync Error",
        description: error.message || "Failed to sync offline data.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, toast]);

  // Sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      toast({
        title: "Back Online",
        description: "Attempting to sync offline transactions...",
      });
      syncPendingSales();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncPendingSales, toast]);

  // Periodic sync attempt (every 2 minutes)
  useEffect(() => {
    const interval = setInterval(syncPendingSales, 120000);
    return () => clearInterval(interval);
  }, [syncPendingSales]);

  return {
    isSyncing,
    syncPendingSales
  };
};

export const queueOfflineSale = async (saleData: any, branchId: string, userId: string) => {
  try {
    const pendingSale: PendingSale = {
      saleData,
      branchId,
      userId,
      createdAt: Date.now(),
      status: 'pending',
      retryCount: 0
    };

    await localDb.pendingSales.add(pendingSale);
  } catch (error) {
    console.error('[OfflineSync] Failed to queue sale:', error);
    throw error;
  }
};
