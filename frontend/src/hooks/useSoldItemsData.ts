import { useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useBusiness } from '@/contexts/BusinessContext';
import { getSoldItemsReportAction } from '@/app/actions/inventory';
import { getDateRangeFromFilter } from '@/utils/dateFilters';
import { useQuery } from '@tanstack/react-query';

export interface SoldItem {
  description: string;
  totalQuantity: number;
  averagePrice: number;
  totalAmount: number;
  totalCost: number;
  totalProfit: number;
  totalDiscount: number;
  averageCost?: number;
  productIds: string[];
}

export const useSoldItemsData = (
  dateFilter: string,
  dateRange: { from: Date | undefined; to: Date | undefined },
  specificDate: Date | undefined,
  showOnlyNotInInventory: boolean,
  initialData?: SoldItem[]
) => {
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();

  const getDateRange = useCallback(() => {
    let from: Date, to: Date;

    if (dateFilter === 'specific-date' && specificDate) {
      from = new Date(specificDate);
      from.setHours(0, 0, 0, 0);
      to = new Date(specificDate);
      to.setHours(23, 59, 59, 999);
    } else if (dateFilter === 'custom' && dateRange.from && dateRange.to) {
      from = dateRange.from;
      to = dateRange.to;
    } else {
      const range = getDateRangeFromFilter(dateFilter);
      from = range.from;
      to = range.to;
    }
    return { from, to };
  }, [dateFilter, dateRange, specificDate]);

  const fetchSoldItems = useCallback(async () => {
    if (!currentBusiness?.id) return { items: [], summary: {} };
    const { from, to } = getDateRange();
    const result = await getSoldItemsReportAction(currentBusiness.id, from.toISOString(), to.toISOString());
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch sold items report');
    }
    
    // The backend now returns { items: [], summary: {} }
    let report = result.data.items as SoldItem[];
    const summary = result.data.summary;

    if (showOnlyNotInInventory) {
      // In this backend implementation, if productIds is empty, it's not in inventory
      report = report.filter(item => item.productIds.length === 0);
    }

    return { items: report, summary };
  }, [currentBusiness, getDateRange, showOnlyNotInInventory]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sold_items_report', currentBusiness?.id, dateFilter, dateRange.from?.toISOString(), dateRange.to?.toISOString(), specificDate?.toISOString(), showOnlyNotInInventory],
    queryFn: fetchSoldItems,
    enabled: !!currentBusiness?.id && !!user,
    staleTime: 60 * 1000,
    // Only use initialData if we have actual items and are looking at the default period (this-month)
    // to prevent showing stale data or empty state for other filters on first load
    initialData: (initialData && initialData.length > 0 && dateFilter === 'this-month') ? { items: initialData, summary: {} } : undefined
  });

  return {
    soldItems: data?.items || [],
    summary: data?.summary || null,
    isLoading,
    loadSoldItemsData: refetch
  };
};
