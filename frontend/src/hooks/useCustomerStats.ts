import { useQuery } from '@tanstack/react-query';
import { getCustomerStatsAction } from '@/app/actions/customers';

export interface CustomerStats {
  totalCustomers: number;
  withBirthdays: number;
  thisMonth: number;
  categoryBreakdown: Record<string, number>;
}

export const useCustomerStats = (userId: string | undefined, branchId: string | undefined, initialData?: any) => {
  return useQuery<CustomerStats>({
    queryKey: ['customer_stats', branchId],
    queryFn: async () => {
      if (!userId || !branchId) {
        return { totalCustomers: 0, withBirthdays: 0, thisMonth: 0, categoryBreakdown: {} };
      }

      const result = await getCustomerStatsAction(userId, branchId);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch customer stats');
      }

      const d = result.data;
      return {
        totalCustomers: d.totalCustomers || 0,
        withBirthdays: d.customersWithBirthdays || d.withBirthdays || 0,
        thisMonth: d.customersThisMonth || d.thisMonth || 0,
        categoryBreakdown: d.categoryBreakdown || {}
      };
    },
    initialData: initialData ? {
        totalCustomers: initialData.totalCustomers || 0,
        withBirthdays: initialData.customersWithBirthdays || initialData.withBirthdays || 0,
        thisMonth: initialData.customersThisMonth || initialData.thisMonth || 0,
        categoryBreakdown: initialData.categoryBreakdown || {}
    } : undefined,
    enabled: !!userId && !!branchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};
