import { useQuery } from '@tanstack/react-query';
import { getAnalyticsSummaryAction } from '@/app/actions/analytics';
import { getDateRangeFromFilter } from '@/utils/dateFilters';

export const useInventoryOverview = (branchId: string | undefined, period: string, initialTopSelling?: any[]) => {
    return useQuery({
        queryKey: ['inventory_overview', branchId, period],
        queryFn: async () => {
            if (!branchId) return { topSellingProducts: [] };
            
            const { from, to } = getDateRangeFromFilter(period);
            const result = await getAnalyticsSummaryAction(branchId, from.toISOString(), to.toISOString());
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch overview stats');
            }
            
            return result.data;
        },
        enabled: !!branchId,
        staleTime: 5 * 60 * 1000, // 5 minutes cache
        initialData: (period === 'this-month' && initialTopSelling) ? { topSellingProducts: initialTopSelling } as any : undefined
    });
};
