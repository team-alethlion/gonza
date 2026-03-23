import { useState, useEffect, useMemo, useCallback } from 'react';
import { Sale, DbSale, mapDbSaleToSale } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { useBusiness } from '@/contexts/BusinessContext';
import { clearInventoryCaches } from '@/utils/inventoryCacheUtils';
import { getSalesAction, deleteSaleAction, getTopCustomersAction } from '@/app/actions/sales';
import { getCustomerLifetimeStatsAction } from '@/app/actions/customers';

export interface TopCustomer {
  id?: string;
  name: string;
  totalPurchases: number;
  orderCount: number;
}

import { localDb } from '@/lib/dexie';

export const useSalesData = (
  userId: string | undefined,
  sortOrder: string = 'desc',
  pageSize?: number,
  enabled: boolean = true,
  initialData?: Sale[]
) => {

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  const { currentBusiness } = useBusiness();

  // Load from Dexie cache on mount
  useEffect(() => {
    const loadFromCache = async () => {
      if (currentBusiness?.id) {
        const query = localDb.sales.where('locationId').equals(currentBusiness.id);
        
        // Apply simple sorting if possible or sort in memory for small datasets
        const cached = await query.reverse().sortBy('date');
        
        if (cached && cached.length > 0) {
          console.log('[Sales] Loaded from Dexie cache');
          // Cache data is handled by React Query queryClient.setQueryData if needed,
          // but for now we rely on the network fetch or initialData.
        }
      }
    };
    loadFromCache();
  }, [currentBusiness?.id]);

  const loadSales = useCallback(async (): Promise<Sale[]> => {
    try {
      if (!userId || !currentBusiness) {
        return [];
      }

      // If pageSize is specified, load only that many records
      const result: any = await getSalesAction(currentBusiness.id, 1, pageSize || 50);
      const salesData = result?.success ? result.data?.sales : [];

      const formattedSales: Sale[] = Array.isArray(salesData) ? salesData.map((item: any) => {
        return mapDbSaleToSale(item);
      }) : [];

      // Update Dexie cache in the background
      if (formattedSales.length > 0 && !pageSize) {
         const cacheData = formattedSales.map(s => ({
           ...s,
           locationId: currentBusiness.id as string,
         }));
         await localDb.sales.where('locationId').equals(currentBusiness.id).delete();
         await localDb.sales.bulkPut(cacheData as unknown as Sale[]);
      }

      return formattedSales;

    } catch (error) {
      console.error('Error loading sales:', error);
      return [];
    }
  }, [userId, currentBusiness, pageSize]);

  // Use a stable initial value to prevent re-renders
  const memoizedInitialData = useMemo(() => {
    if (!initialData) return undefined;
    return initialData.map(s => ({
      ...s,
      date: new Date(s.date),
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt || s.createdAt)
    }));
  }, [initialData]);

  // React Query caching
  const baseQueryKey = useMemo(() => ['sales', currentBusiness?.id, userId], [currentBusiness?.id, userId]);
  const queryKey = useMemo(() => [...baseQueryKey, { sortOrder, pageSize }], [baseQueryKey, sortOrder, pageSize]);

  const {
    data: sales = initialData || [],
    isLoading: isQueryLoading,
    isFetching,
    refetch
  } = useQuery({
    queryKey,
    queryFn: loadSales,
    enabled: enabled && !!userId && !!currentBusiness?.id,
    staleTime: 30_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    initialData: memoizedInitialData
  });

  // Derived loading state
  const isLoading = isQueryLoading || (isFetching && sales.length === 0);

  const { data: topCustomers = [] } = useQuery({
    queryKey: ['top_customers', currentBusiness?.id],
    queryFn: async () => {
      if (!currentBusiness?.id) return [];
      const result = await getTopCustomersAction(currentBusiness.id);
      return result.success ? (result.data as TopCustomer[]) : [];
    },
    enabled: enabled && !!currentBusiness?.id,
    staleTime: 5 * 60_000,
  });

  const getTopCustomers = useMemo(() => topCustomers, [topCustomers]);

  // Memoize customer lifetime purchases function using backend action
  const getCustomerLifetimePurchases = useCallback(async (customerName: string) => {
    if (!currentBusiness?.id) return { total: 0, count: 0 };
    const result = await getCustomerLifetimeStatsAction(currentBusiness.id, customerName);
    return result.success && result.data ? result.data : { total: 0, count: 0 };
  }, [currentBusiness?.id]);

  const clearSoldItemsCache = useCallback(() => {
    if (!currentBusiness?.id) return;
    const key = `soldItemsFilters_${currentBusiness.id}`;
    localStorage.removeItem(key);

    // Also clear legacy keys for safety
    localStorage.removeItem('soldItemsFilters');
  }, [currentBusiness?.id]);

  const deleteSale = useCallback(async (id: string) => { // Changed to useCallback
    try {
      // First, find the sale to get its details for logging
      const saleToDelete = sales.find(sale => sale.id === id);
      if (!saleToDelete) {
        throw new Error('Sale not found');
      }

      // NOTE: Inventory restoration is now handled atomically on the server 
      // inside deleteSaleAction Prisma transaction.

      // Proceed to delete the sale via API Action
      if (!currentBusiness?.id) {
        throw new Error('Business context missing for deletion');
      }

      const result = await deleteSaleAction(id, currentBusiness.id);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Update React Query cache
      queryClient.setQueryData(queryKey, (oldData: Sale[] | undefined) => {
        return oldData ? oldData.filter(sale => sale.id !== id) : [];
      });
      queryClient.invalidateQueries({ queryKey: baseQueryKey });

      // Clear sold items cache after deletion
      clearSoldItemsCache();

      // Log activity for sale deletion
      await logActivity({
        activityType: 'DELETE',
        module: 'SALES',
        entityType: 'sale',
        entityId: id,
        entityName: `Sale #${saleToDelete.receiptNumber}`,
        description: `Deleted sale for ${saleToDelete.customerName} - Total: UGX ${((saleToDelete.amountPaid || 0) + (saleToDelete.amountDue || 0)).toLocaleString()} (Stock restored)`,
        metadata: {
          receiptNumber: saleToDelete.receiptNumber,
          customerName: saleToDelete.customerName,
          customerAddress: saleToDelete.customerAddress,
          customerContact: saleToDelete.customerContact,
          totalAmount: (saleToDelete.amountPaid || 0) + (saleToDelete.amountDue || 0),
          amountPaid: saleToDelete.amountPaid,
          profit: saleToDelete.profit,
          paymentStatus: saleToDelete.paymentStatus,
          taxRate: saleToDelete.taxRate,
          itemCount: saleToDelete.items.length,
          items: saleToDelete.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            cost: item.cost,
            total: item.quantity * item.price,
            discountPercentage: item.discountPercentage,
            discountAmount: item.discountAmount
          })),
          notes: saleToDelete.notes,
          cashTransactionDeleted: !!saleToDelete.cashTransactionId
        }
      });

      toast({
        title: "Sale Deleted",
        description: "The sale record and associated data have been successfully deleted."
      });

      clearInventoryCaches();
      return true;
    } catch (error) {
      console.error('Error deleting sale:', error);
      toast({
        title: "Error",
        description: "Failed to delete sale. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }, [sales, currentBusiness?.id, queryClient, queryKey, baseQueryKey, clearSoldItemsCache, logActivity, toast]);


  const addSale = useCallback((newSale: Sale) => {
    queryClient.setQueryData(queryKey, (oldData: Sale[] | undefined) => {
      return oldData ? [newSale, ...oldData] : [newSale];
    });
    queryClient.invalidateQueries({ queryKey: baseQueryKey });
    clearSoldItemsCache();
    clearInventoryCaches();
  }, [queryClient, queryKey, baseQueryKey, clearSoldItemsCache]);

  const updateSale = useCallback((updatedSale: Sale) => {
    queryClient.setQueryData(queryKey, (oldData: Sale[] | undefined) => {
      return oldData ? oldData.map(s => s.id === updatedSale.id ? updatedSale : s) : [updatedSale];
    });
    queryClient.invalidateQueries({ queryKey: baseQueryKey });
    clearSoldItemsCache();
    clearInventoryCaches();
  }, [queryClient, queryKey, baseQueryKey, clearSoldItemsCache]);

  return {
    sales,
    isLoading,
    deleteSale,
    addSale,
    updateSale,
    getTopCustomers,
    getCustomerLifetimePurchases,
    clearSoldItemsCache,
    refetch,
    isFetching
  };
};
