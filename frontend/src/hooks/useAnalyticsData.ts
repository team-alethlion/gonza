/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useRef } from "react";
import { Sale, AnalyticsData } from "@/types";
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
} from "date-fns";
import { useBusiness } from "@/contexts/BusinessContext";
import { getAnalyticsSummaryAction } from "@/app/actions/analytics";

interface UseAnalyticsDataProps {
  sales: Sale[];
  dateFilter: string;
  dateRange: { from: Date | undefined; to: Date | undefined };
  specificDate?: Date | undefined;
  isCustomRange: boolean;
  isSpecificDate?: boolean;
  initialAnalytics?: AnalyticsData | null;
}

import { localDb } from "@/lib/dexie";

// 🛡️ CACHE VERSIONING: Prevent schema drift crashes
const ANALYTICS_SCHEMA_VERSION = "v1.2";

export function useAnalyticsData({
  sales: initialSales,
  dateFilter,
  dateRange,
  specificDate,
  isCustomRange,
  isSpecificDate,
  initialAnalytics,
}: UseAnalyticsDataProps) {
  const { currentBusiness } = useBusiness();

  // 🛡️ HYDRATION GUARD: Prevent redundant fetches if server data is fresh
  const lastFetchTimeRef = useRef<number>(initialAnalytics ? Date.now() : 0);
  const hasInitializedFromContext = useRef(false);

  const [summary, setSummary] = useState<AnalyticsData | null>(() => {
    if (dateFilter === "all" && initialAnalytics) {
      hasInitializedFromContext.current = true;
      return initialAnalytics;
    }
    return null;
  });

  // Sync summary instantly if context data arrives after mount
  useEffect(() => {
    if (
      dateFilter === "all" &&
      initialAnalytics &&
      !hasInitializedFromContext.current
    ) {
      setSummary(initialAnalytics);
      hasInitializedFromContext.current = true;
      lastFetchTimeRef.current = Date.now();
    }
  }, [initialAnalytics, dateFilter]);

  const [isLoadingSummary, setIsLoadingSummary] = useState(!summary);

  // 🚀 PERFORMANCE: Load from Dexie cache on mount for instant "all" view
  useEffect(() => {
    if (dateFilter !== "all" || initialAnalytics || !currentBusiness?.id) return;

    const loadFromCache = async () => {
      try {
        const cached = await localDb.dashboardAnalytics.get(currentBusiness.id);
        if (cached && (cached as any).version === ANALYTICS_SCHEMA_VERSION) {
          console.log("[Analytics] Loaded from local cache (Speed Boost)");
          setSummary(cached.summary);
          // Set fetch time to far past so revalidation triggers immediately
          lastFetchTimeRef.current = 0; 
        }
      } catch (err) {
        console.warn("[Analytics] Cache read failed:", err);
      }
    };
    loadFromCache();
  }, [currentBusiness?.id, dateFilter, initialAnalytics]);

  // Fetch analytics summary from server based on filters
  useEffect(() => {
    let isMounted = true;

    const fetchSummary = async () => {
      if (!currentBusiness?.id) {
        setSummary(null);
        setIsLoadingSummary(false);
        return;
      }

      // 🛡️ HYDRATION CHECK: If it's the 'all' view and we have fresh data, skip this fetch
      const isInitialAll = dateFilter === "all" && initialAnalytics;
      const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;

      if (isInitialAll && timeSinceLastFetch < 60000) {
        console.log(
          "[Analytics] Skipping background refresh: SSR data is fresh (< 60s)",
        );
        setIsLoadingSummary(false);
        return;
      }

      if (!isInitialAll) {
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
        } else if (dateFilter !== "all") {
          const today = new Date();
          switch (dateFilter) {
            case "today":
              startDate = startOfDay(today).toISOString();
              endDate = endOfDay(today).toISOString();
              break;
            case "yesterday":
              const yesterday = subDays(today, 1);
              startDate = startOfDay(yesterday).toISOString();
              endDate = endOfDay(yesterday).toISOString();
              break;
            case "this-week":
              startDate = startOfWeek(today, { weekStartsOn: 1 }).toISOString();
              endDate = endOfWeek(today, { weekStartsOn: 1 }).toISOString();
              break;
            case "last-week":
              const lastWeekStart = subWeeks(
                startOfWeek(today, { weekStartsOn: 1 }),
                1,
              );
              startDate = lastWeekStart.toISOString();
              endDate = endOfWeek(lastWeekStart, {
                weekStartsOn: 1,
              }).toISOString();
              break;
            case "this-month":
              startDate = startOfMonth(today).toISOString();
              endDate = endOfMonth(today).toISOString();
              break;
            case "last-month":
              const lastMonth = subMonths(today, 1);
              startDate = startOfMonth(lastMonth).toISOString();
              endDate = endOfMonth(lastMonth).toISOString();
              break;
            case "this-year":
              startDate = startOfYear(today).toISOString();
              endDate = endOfYear(today).toISOString();
              break;
          }
        }

        const result = await getAnalyticsSummaryAction(
          currentBusiness.id,
          startDate,
          endDate,
        );

        if (isMounted && result.success && result.data) {
          lastFetchTimeRef.current = Date.now(); // Update timestamp
          // Only update if the data is different to avoid unnecessary re-renders
          const newData = result.data as AnalyticsData;
          setSummary((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(newData)) return prev;
            return newData;
          });

          // Only cache the 'all' view (main dashboard)
          if (dateFilter === "all") {
            await localDb.dashboardAnalytics.put({
              id: currentBusiness.id,
              summary: result.data,
              updatedAt: Date.now(),
              version: ANALYTICS_SCHEMA_VERSION // Track version to prevent drift
            } as any);
          }
        }
      } catch (error) {
        console.error("Failed to fetch analytics summary:", error);
      } finally {
        if (isMounted) setIsLoadingSummary(false);
      }
    };

    fetchSummary();

    return () => {
      isMounted = false;
    };
  }, [
    dateFilter,
    isCustomRange,
    isSpecificDate,
    dateRange.from,
    dateRange.to,
    specificDate,
    currentBusiness?.id,
    initialAnalytics,
  ]);

  // 1. Resolve display summary
  // We trust the backend summary as the sole source of truth for global aggregates.
  const displaySummary = useMemo(() => {
    if (summary) return summary;
    return null; // Return null while loading to trigger skeleton states in UI
  }, [summary]);

  // Memoize bar chart data only when summary is available
  const barChartData = useMemo(() => {
    if (!displaySummary) return [];
    return [
      { name: "Total Sales", amount: displaySummary.totalSales || 0 },
      { name: "Total Cost", amount: displaySummary.totalCost || 0 },
      { name: "Total Expenses", amount: displaySummary.totalExpenses || 0 },
      { name: "Total Profit", amount: displaySummary.totalProfit || 0 },
    ];
  }, [displaySummary]);

  // Prioritize initialSales (formatted data) over summary.recentSales (raw data)
  // KEEPING THIS EXACTLY AS REQUESTED: DO NOT CHANGE THIS LOGIC
  const recentSales = useMemo(() => {
    if (initialSales && initialSales.length > 0) {
      return [...initialSales]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 20);
    }
    return summary?.recentSales || [];
  }, [initialSales, summary?.recentSales]);

  // Non-quote count from summary
  const nonQuoteSalesCount = useMemo(() => {
    if (!displaySummary) return 0;
    return (
      (displaySummary.paidSalesCount || 0) +
      (displaySummary.pendingSalesCount || 0)
    );
  }, [displaySummary]);

  return {
    filteredSales: initialSales,
    analyticsData: displaySummary,
    barChartData,
    recentSales,
    nonQuoteSalesCount,
    expenses: displaySummary?.totalExpenses || 0,
    isLoadingExpenses: isLoadingSummary,
    inventoryStats: displaySummary?.inventoryStats || null,
    activeGoal: displaySummary?.activeGoal || null,
    activeGoals: (displaySummary as any)?.activeGoals || {},
  };
}
