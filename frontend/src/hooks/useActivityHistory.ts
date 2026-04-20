/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from "react";
import { useCurrentUser } from "./useCurrentUser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getActivityHistoryAction,
  getActivityStatsAction,
  ActivityFilters as ActionFilters,
} from "@/app/actions/activity";
import { ActivityHistoryItem, ActivityFilters } from "@/types";

const ITEMS_PER_PAGE = 20;

/**
 * Hook for Activity Summary & Aggregates
 */
export const useActivitySummary = (locationId?: string, initialStats?: any) => {
  const { userId } = useCurrentUser();
  const [filters, setFilters] = useState<ActionFilters>({});

  const fetchStats = useCallback(async () => {
    if (!userId || !locationId) return null;
    const result = await getActivityStatsAction(locationId, filters);
    if (!result.success) return null;
    return result.data;
  }, [userId, locationId, filters]);

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["activity_stats", userId, locationId, JSON.stringify(filters)],
    queryFn: fetchStats,
    enabled: !!userId && !!locationId,
    staleTime: 5 * 60_000,
    initialData: (initialStats && Object.keys(filters).length === 0) ? initialStats : undefined
  });

  return {
    stats,
    isLoading,
    isError,
    filters,
    setFilters
  };
};

/**
 * Hook for Paginated Activity List
 */
export const useActivityHistory = (
  locationId?: string,
  filters?: ActivityFilters,
  initialData?: any
) => {
  const { userId } = useCurrentUser();
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  const fetchActivities = useCallback(async (): Promise<{
    activities: ActivityHistoryItem[];
    count: number;
  }> => {
    if (!userId || !locationId) {
      return { activities: [], count: 0 };
    }

    try {
      const lastActivity = queriedData?.activities[queriedData.activities.length - 1];
      const lastTimestamp = currentPage > 1 ? lastActivity?.created_at : undefined;

      const actionFilters: ActionFilters = filters
        ? {
            activityType: filters.activityType,
            module: filters.module,
            search: filters.search,
            dateFrom: filters.dateRange.from?.toISOString(),
            dateTo: filters.dateRange.to?.toISOString(),
          }
        : {};

      const result = await getActivityHistoryAction(
        locationId,
        userId,
        currentPage,
        ITEMS_PER_PAGE,
        { ...actionFilters, last_timestamp: lastTimestamp } as any
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch activities");
      }

      return {
        activities: result.data.activities as ActivityHistoryItem[],
        count: result.data.count,
      };
    } catch (error) {
      console.error("Error fetching activity history:", error);
      return { activities: [], count: 0 };
    }
  }, [userId, locationId, currentPage, filters]);

  // React Query caching
  const queryKey = [
    "activity_history",
    userId,
    locationId,
    currentPage,
    JSON.stringify(filters),
  ];
  
  const { data: queriedData, isLoading: isQueryLoading } = useQuery({
    queryKey,
    queryFn: fetchActivities,
    enabled: !!userId && !!locationId,
    staleTime: 60_000,
    // 🛡️ DATA INTEGRITY: Only use initialData if we are on the first page AND no filters/search are applied
    initialData: (
      initialData && 
      currentPage === 1 && 
      !filters?.search && 
      (!filters?.activityType || filters?.activityType === 'ALL') &&
      (!filters?.module || filters?.module === 'ALL') &&
      !filters?.dateRange?.from
    ) ? initialData : undefined
  });

  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [filterKey]);

  const refetchActivities = () => {
    queryClient.invalidateQueries({ queryKey: ["activity_history"] });
    queryClient.invalidateQueries({ queryKey: ["activity_stats"] });
  };

  return {
    activities: queriedData?.activities || [],
    isLoading: isQueryLoading && !queriedData,
    totalCount: queriedData?.count || 0,
    currentPage,
    totalPages: Math.ceil((queriedData?.count || 0) / ITEMS_PER_PAGE),
    setCurrentPage,
    refetch: refetchActivities,
  };
};
