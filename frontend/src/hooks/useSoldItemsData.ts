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
  showOnlyNotInInventory: boolean
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
    if (!currentBusiness?.id) return [];
    const { from, to } = getDateRange();
    const result = await getSoldItemsReportAction(currentBusiness.id, from.toISOString(), to.toISOString());
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch sold items report');
    }
    
    let report = result.data as SoldItem[];

    if (showOnlyNotInInventory) {
      // In this backend implementation, if productIds is empty, it's not in inventory
      report = report.filter(item => item.productIds.length === 0);
    }

    return report;
  }, [currentBusiness, getDateRange, showOnlyNotInInventory]);

  const { data: soldItems = [], isLoading, refetch } = useQuery({
    queryKey: ['sold_items_report', currentBusiness?.id, dateFilter, dateRange, specificDate, showOnlyNotInInventory],
    queryFn: fetchSoldItems,
    enabled: !!currentBusiness?.id && !!user,
    staleTime: 60 * 1000,
  });

  return {
    soldItems,
    isLoading,
    loadSoldItemsData: refetch
  };
};
