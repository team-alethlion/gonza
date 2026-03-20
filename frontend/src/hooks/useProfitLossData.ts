import { useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useBusiness } from '@/contexts/BusinessContext';
import { getProfitLossAction } from '@/app/actions/finance';
import { getDateRangeFromFilter } from '@/utils/dateFilters';
import { useQuery } from '@tanstack/react-query';

export interface ProfitLossData {
  sales: number;
  salesReturns: number;
  netSales: number;
  openingStock: number;
  purchases: number;
  carriageInwards: number;
  closingStock: number;
  totalCostSales: number; // Added for new COGS calculation
  totalCOGS: number;
  grossProfit: number;
  expensesByCategory: { [key: string]: number };
  totalExpenses: number;
  netProfitLoss: number;
  taxPercentage: number;
  taxAmount: number;
  finalProfitAfterTax: number;
}

export const useProfitLossData = (
  dateFilter: string,
  dateRange: { from: Date | undefined; to: Date | undefined },
  specificDate: Date | undefined,
  taxPercentage: number = 0
) => {
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();

  const getDateRange = useCallback(() => {
    let from: Date, to: Date;

    if (dateFilter === 'specific' && specificDate) {
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

  const fetchProfitLoss = useCallback(async () => {
    if (!currentBusiness?.id) return null;
    const { from, to } = getDateRange();
    const result = await getProfitLossAction(currentBusiness.id, from, to, taxPercentage);
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch profit and loss data');
    }
    return result.data as ProfitLossData;
  }, [currentBusiness, getDateRange, taxPercentage]);

  const { data: profitLossData, isLoading } = useQuery({
    queryKey: ['profit_loss', currentBusiness?.id, dateFilter, dateRange, specificDate, taxPercentage],
    queryFn: fetchProfitLoss,
    enabled: !!currentBusiness?.id && !!user,
    staleTime: 60 * 1000, // 1 minute
  });

  const defaultData: ProfitLossData = {
    sales: 0,
    salesReturns: 0,
    netSales: 0,
    openingStock: 0,
    purchases: 0,
    carriageInwards: 0,
    closingStock: 0,
    totalCostSales: 0,
    totalCOGS: 0,
    grossProfit: 0,
    expensesByCategory: {},
    totalExpenses: 0,
    netProfitLoss: 0,
    taxPercentage,
    taxAmount: 0,
    finalProfitAfterTax: 0,
  };

  return {
    profitLossData: profitLossData || defaultData,
    isLoading
  };
};
