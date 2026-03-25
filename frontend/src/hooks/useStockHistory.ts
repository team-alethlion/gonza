/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/contexts/BusinessContext';
import {
  getStockHistoryAction,
  createStockHistoryAction,
  recalculateStockChainAction,
  deleteStockHistoryEntriesByReferenceAction,
  updateStockHistoryDatesByReferenceAction,
  repairStockChainsAction,
  getStockRepairsPreviewAction,
  updateStockHistoryEntryAction,
  deleteStockHistoryEntryAction,
  deleteMultipleStockHistoryEntriesAction
} from '@/app/actions/inventory';

export interface ChainRepairBreakEntry {
  entryId: string;
  createdAt: string;
  changeReason: string;
  currentPrevQty: number;
  currentNewQty: number;
  fixedPrevQty: number;
  fixedNewQty: number;
}

export interface ChainRepairPreview {
  productId: string;
  productName: string;
  totalEntries: number;
  brokenEntries: ChainRepairBreakEntry[];
  finalFixedQty: number;
  currentProductQty: number;
}

import { localDb } from '@/lib/dexie';

export const useStockHistory = (userId: string | undefined, productId?: string) => {
  const { currentBusiness } = useBusiness();
  const queryClient = useQueryClient();

  const queryKey = productId 
    ? ['stock_history', currentBusiness?.id, productId]
    : ['stock_history', currentBusiness?.id];

  // 🚀 REFACTORED: Use React Query for de-duplication and 5-minute caching
  const { data: stockHistory = [], isLoading, refetch: loadStockHistory } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId || !currentBusiness) return [];

      const result = await getStockHistoryAction(currentBusiness.id, productId);
      if (!result.success) throw new Error(result.error || 'Failed to fetch history');

      const rawData = Array.isArray(result.data) ? result.data : [];
      const formatted = rawData.map((entry: any) => ({
        id: entry.id,
        productId: entry.productId,
        oldQuantity: entry.oldQuantity,
        newQuantity: entry.newQuantity,
        costPrice: entry.costPrice,
        sellingPrice: entry.sellingPrice,
        changeReason: entry.changeReason,
        createdAt: new Date(entry.createdAt),
        referenceId: entry.referenceId,
        receiptNumber: entry.receiptNumber,
        product: entry.product
      }));

      // Background Dexie sync
      if (formatted.length > 0 && !productId) {
        const cacheData = formatted.map(h => ({ ...h, locationId: currentBusiness.id }));
        localDb.stockHistory.where('locationId').equals(currentBusiness.id as string).delete().then(() => {
            localDb.stockHistory.bulkPut(cacheData as any);
        });
      }

      return formatted;
    },
    enabled: !!currentBusiness?.id && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createStockHistoryEntry = async (
    targetProductId: string,
    previousQuantity: number,
    newQuantity: number,
    reason: string,
    referenceId?: string,
    entryDate?: Date,
    receiptNumber?: string,
    productName?: string
  ) => {
    try {
      if (!userId || !currentBusiness) return false;

      const snapshottedReason = productName
        ? `[${productName}] | ${reason}`
        : reason;

      const result = await createStockHistoryAction({
        userId,
        locationId: currentBusiness.id,
        productId: targetProductId,
        previousQuantity,
        newQuantity,
        changeReason: snapshottedReason,
        referenceId,
        receiptNumber,
        createdAt: entryDate?.toISOString()
      });

      if (!result.success) return false;

      queryClient.invalidateQueries({ queryKey: ['stock_history', currentBusiness.id] });
      return true;
    } catch (error) {
      return false;
    }
  };

  const deleteMultipleStockHistoryEntriesByReference = async (referenceId: string) => {
    try {
      if (!currentBusiness) return false;
      const result = await deleteStockHistoryEntriesByReferenceAction(referenceId, currentBusiness.id);
      if (!result.success) throw new Error(result.error);

      queryClient.invalidateQueries({ queryKey: ['stock_history', currentBusiness.id] });
      return true;
    } catch (error) {
      return false;
    }
  };

  const deleteMultipleStockHistoryEntries = async (entryIds: string[]) => {
    try {
      if (!currentBusiness) return false;
      const result = await deleteMultipleStockHistoryEntriesAction(entryIds, currentBusiness.id);
      if (!result.success) throw new Error(result.error);
      queryClient.invalidateQueries({ queryKey: ['stock_history', currentBusiness.id] });
      return true;
    } catch (error) {
      return false;
    }
  }

  const updateStockHistoryEntry = async (entryId: string, newQuantity: number, changeReason: string, createdAt?: Date) => {
    try {
      if (!currentBusiness) return false;
      const result = await updateStockHistoryEntryAction(entryId, currentBusiness.id, {
        newQuantity,
        changeReason,
        createdAt: createdAt?.toISOString()
      });
      if (!result.success) throw new Error(result.error);
      queryClient.invalidateQueries({ queryKey: ['stock_history', currentBusiness.id] });
      return true;
    } catch (error) {
      return false;
    }
  }

  const deleteStockHistoryEntry = async (entryId: string) => {
    try {
      if (!currentBusiness) return false;
      const result = await deleteStockHistoryEntryAction(entryId, currentBusiness.id);
      if (!result.success) throw new Error(result.error);
      queryClient.invalidateQueries({ queryKey: ['stock_history', currentBusiness.id] });
      return true;
    } catch (error) {
      return false;
    }
  }

  const recalculateStockChain = async (targetProductId: string) => {
    try {
      if (!currentBusiness) return false;
      const result = await recalculateStockChainAction(targetProductId, currentBusiness.id);
      if (!result.success) throw new Error(result.error);

      queryClient.invalidateQueries({ queryKey: ['stock_history', currentBusiness.id] });
      return true;
    } catch (error) {
      return false;
    }
  };

  const updateStockHistoryDatesBySaleId = async (saleId: string, newDate: Date) => {
    try {
      if (!currentBusiness) return false;
      const result = await updateStockHistoryDatesByReferenceAction(saleId, currentBusiness.id, newDate.toISOString());
      if (!result.success) throw new Error(result.error);

      queryClient.invalidateQueries({ queryKey: ['stock_history', currentBusiness.id] });
      return true;
    } catch (error) {
      return false;
    }
  };

  const repairAllStockChains = async () => {
    try {
      if (!currentBusiness) return { repaired: 0, failed: 0 };
      const result = await repairStockChainsAction(currentBusiness.id);
      if (result.success && result.data) {
        queryClient.invalidateQueries({ queryKey: ['stock_history', currentBusiness.id] });
        return result.data;
      }
      return { repaired: 0, failed: 0 };
    } catch (error) {
      return { repaired: 0, failed: 0 };
    }
  }

  const previewStockChainRepairs = async () => {
    try {
      if (!currentBusiness) return [];
      const result = await getStockRepairsPreviewAction(currentBusiness.id);
      if (result.success && result.data) return result.data;
      return [];
    } catch (error) {
      return [];
    }
  }

  return {
    stockHistory,
    isLoading,
    createStockHistoryEntry,
    updateStockHistoryEntry,
    deleteStockHistoryEntry,
    deleteMultipleStockHistoryEntries,
    deleteMultipleStockHistoryEntriesByReference,
    recalculateStockChain,
    recalculateProductStock: recalculateStockChain,
    updateStockHistoryDatesBySaleId,
    repairAllStockChains,
    previewStockChainRepairs,
    refreshHistory: loadStockHistory,
    loadStockHistory
  };
};
