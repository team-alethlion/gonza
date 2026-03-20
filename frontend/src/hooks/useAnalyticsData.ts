import { useState, useEffect, useMemo } from 'react';
import { Sale, AnalyticsData } from '@/types';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
} from 'date-fns';
import { useBusiness } from '@/contexts/BusinessContext';
import { getAnalyticsSummaryAction } from '@/app/actions/analytics';

interface UseAnalyticsDataProps {
  sales: Sale[];
  dateFilter: string;
  dateRange: { from: Date | undefined; to: Date | undefined; };
  specificDate?: Date | undefined;
  isCustomRange: boolean;
  isSpecificDate?: boolean;
}

import { localDb } from '@/lib/dexie';

export function useAnalyticsData({ sales: initialSales, dateFilter, dateRange, specificDate, isCustomRange, isSpecificDate }: UseAnalyticsDataProps) {
  const { currentBusiness, initialAnalyticsSummary } = useBusiness();
  const [summary, setSummary] = useState<AnalyticsData | null>(() => {
    // 1. Try initial summary from SSR
    if (dateFilter === 'all' && initialAnalyticsSummary) {
      return initialAnalyticsSummary;
    }
    return null;
  });
  const [isLoadingSummary, setIsLoadingSummary] = useState(!summary);

  // Fetch analytics summary from server based on filters
  useEffect(() => {
    let isMounted = true;

    const fetchSummary = async () => {
      if (!currentBusiness?.id) {
        setSummary(null);
        setIsLoadingSummary(false);
        return;
      }

      // If it's the 'all' filter and we have SSR data, we still fetch in background 
      // to ensure freshness, but we don't set loading state to true.
      const isInitialAll = dateFilter === 'all' && initialAnalyticsSummary && !summary;
      
      if (!summary && !isInitialAll) {
        setIsLoadingSummary(true);
      }

      try {
        let startDate: string | undefined;
        let endDate: string | undefined;

        if (isCustomRange && dateRange.from && dateRange.to) {
          startDate = dateRange.from.toISOString();
          endDate = dateRange.to.toISOString();
        } else if (isSpecificDate && specificDate) {
          startDate = startOfDay(specificDate).toISOString();
          endDate = endOfDay(specificDate).toISOString();
        } else if (dateFilter !== 'all') {
          const today = new Date();
          switch (dateFilter) {
            case 'today':
              startDate = startOfDay(today).toISOString();
              endDate = endOfDay(today).toISOString();
              break;
            case 'yesterday':
              const yesterday = subDays(today, 1);
              startDate = startOfDay(yesterday).toISOString();
              endDate = endOfDay(yesterday).toISOString();
              break;
            case 'this-week':
              startDate = startOfWeek(today, { weekStartsOn: 1 }).toISOString();
              endDate = endOfWeek(today, { weekStartsOn: 1 }).toISOString();
              break;
            case 'last-week':
              const lastWeekStart = subWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1);
              startDate = lastWeekStart.toISOString();
              endDate = endOfWeek(lastWeekStart, { weekStartsOn: 1 }).toISOString();
              break;
            case 'this-month':
              startDate = startOfMonth(today).toISOString();
              endDate = endOfMonth(today).toISOString();
              break;
            case 'last-month':
              const lastMonth = subMonths(today, 1);
              startDate = startOfMonth(lastMonth).toISOString();
              endDate = endOfMonth(lastMonth).toISOString();
              break;
            case 'this-year':
              startDate = startOfYear(today).toISOString();
              endDate = endOfYear(today).toISOString();
              break;
          }
        }

        const result = await getAnalyticsSummaryAction(currentBusiness.id, startDate, endDate);

        if (isMounted && result.success && result.data) {
          // Only update if the data is different to avoid unnecessary re-renders
          const newData = result.data as AnalyticsData;
          setSummary(prev => {
            if (JSON.stringify(prev) === JSON.stringify(newData)) return prev;
            return newData;
          });

          // Only cache the 'all' view (main dashboard)
          if (dateFilter === 'all') {
            await localDb.dashboardAnalytics.put({
              id: currentBusiness.id,
              summary: result.data,
              updatedAt: Date.now()
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch analytics summary:', error);
      } finally {
        if (isMounted) setIsLoadingSummary(false);
      }
    };

    fetchSummary();

    return () => {
      isMounted = false;
    };
  }, [dateFilter, isCustomRange, isSpecificDate, dateRange.from, dateRange.to, specificDate, currentBusiness?.id]);

  // Memoize bar chart data
  const barChartData = useMemo(() => [
    { name: 'Total Sales', amount: summary?.totalSales || 0 },
    { name: 'Total Cost', amount: summary?.totalCost || 0 },
    { name: 'Total Expenses', amount: summary?.totalExpenses || 0 },
    { name: 'Total Profit', amount: summary?.totalProfit || 0 },
  ], [summary]);

  // Memoize recent sales (already filtered/limited by the caller usually)
  const recentSales = useMemo(() => {
    if (summary?.recentSales && summary.recentSales.length > 0) {
        return summary.recentSales;
    }
    return [...initialSales]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);
  }, [initialSales, summary?.recentSales]);

  // Non-quote count (from summary if available, else from list)
  const nonQuoteSalesCount = useMemo(() => {
    if (summary) return summary.paidSalesCount + summary.pendingSalesCount;
    return initialSales.filter(s => s.paymentStatus !== 'Quote').length;
  }, [summary, initialSales]);

  return {
    filteredSales: initialSales,
    analyticsData: summary || {
      totalSales: 0,
      totalProfit: 0,
      totalCost: 0,
      paidSalesCount: 0,
      pendingSalesCount: 0,
    },
    barChartData,
    recentSales,
    nonQuoteSalesCount,
    expenses: summary?.totalExpenses || 0,
    isLoadingExpenses: isLoadingSummary
  };
}
