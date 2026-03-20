import { useState, useEffect, useCallback } from "react";
import { useCurrentUser } from "./useCurrentUser";
import { ActivityFilters as FilterTypes } from "@/app/(agency)/agency/history/page";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getActivityHistoryAction,
  ActivityFilters,
} from "@/app/actions/activity";

export interface ActivityHistoryItem {
  id: string;
  user_id: string;
  location_id: string;
  activity_type: "CREATE" | "UPDATE" | "DELETE";
  module:
    | "SALES"
    | "INVENTORY"
    | "EXPENSES"
    | "FINANCE"
    | "CUSTOMERS"
    | "TASKS";
  entity_type: string;
  entity_id: string | null;
  entity_name: string;
  description: string;
  metadata: any;
  created_at: string;
  profile_id: string | null;
  profile_name: string | null;
}

const ITEMS_PER_PAGE = 20;

export const useActivityHistory = (
  locationId?: string,
  filters?: FilterTypes,
) => {
  const { userId } = useCurrentUser();
  const [activities, setActivities] = useState<ActivityHistoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const queryClient = useQueryClient();

  const fetchActivities = useCallback(async (): Promise<{
    activities: ActivityHistoryItem[];
    count: number;
  }> => {
    if (!userId || !locationId) {
      return { activities: [], count: 0 };
    }

    try {
      const actionFilters: ActivityFilters = filters
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
        actionFilters,
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
    filters,
  ];
  const { data: queriedData, isLoading: isQueryLoading } = useQuery({
    queryKey,
    queryFn: fetchActivities,
    enabled: !!userId && !!locationId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (queriedData) {
      setActivities(queriedData.activities);
      setTotalCount(queriedData.count);
      setTotalPages(Math.ceil(queriedData.count / ITEMS_PER_PAGE));
    }
  }, [queriedData]);

  // Derived loading state - only true when no cached page data
  const isLoading = isQueryLoading && !queriedData;

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [filters]);

  const refetchActivities = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  // Realtime: In the Next.js/Prisma model, we typically rely on manual invalidation
  // or polling. Supabase realtime is removed here to align with the Prisma migration.
  useEffect(() => {
    if (!userId || !locationId) return;

    // Realtime invalidation would now happen via Server Actions or a dedicated WS server.
    // For now, we rely on manual refresh or cache invalidation from mutations.
  }, [userId, locationId, currentPage, filters]);

  return {
    activities,
    isLoading,
    totalCount,
    currentPage,
    totalPages,
    setCurrentPage,
    refetch: refetchActivities,
  };
};
