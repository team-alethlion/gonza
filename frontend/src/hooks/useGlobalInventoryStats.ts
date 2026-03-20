import { useQuery } from '@tanstack/react-query';
import { getGlobalInventoryStatsAction, InventoryStats } from '@/app/actions/analytics';

export type GlobalInventoryStats = InventoryStats;

export const useGlobalInventoryStats = (businessId: string | undefined) => {
    return useQuery<GlobalInventoryStats>({
        queryKey: ['inventory_global_stats', businessId],
        queryFn: async (): Promise<GlobalInventoryStats> => {
            if (!businessId) {
                return {
                    totalCostValue: 0,
                    totalStockValue: 0,
                    lowStockCount: 0,
                    outOfStockCount: 0
                };
            }

            const result = await getGlobalInventoryStatsAction(businessId);

            if (!result.success || !result.data) {
                console.error('Error fetching global stats:', result.error);
                throw new Error(result.error || 'Failed to fetch global stats');
            }

            return result.data;
        },
        enabled: !!businessId,
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // Keep cache for 5 mins
    });
};
