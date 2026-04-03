import { useQuery } from '@tanstack/react-query';
import { getCustomerStatsAction } from '@/app/actions/customers';

export interface CustomerStats {
  withBirthdays: number;
  thisMonth: number;
}

export const useCustomerStats = (userId: string | undefined, branchId: string | undefined) => {
  return useQuery<CustomerStats>({
    queryKey: ['customer_stats', branchId],
    queryFn: async () => {
      if (!userId || !branchId) {
        return { withBirthdays: 0, thisMonth: 0 };
      }

      const result = await getCustomerStatsAction(userId, branchId);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch customer stats');
      }

      return {
        withBirthdays: result.data.withBirthdays || 0,
        thisMonth: result.data.thisMonth || 0,
      };
    },
    enabled: !!userId && !!branchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};
