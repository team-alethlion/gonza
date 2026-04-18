import { useQuery } from '@tanstack/react-query';
import { getCustomerStatsAction } from '@/app/actions/customers';

export interface CustomerStats {
  totalCustomers: number;
  birthdaysThisMonth: number;
  newThisMonth: number;
  categoryBreakdown: Record<string, number>;
}

export const useCustomerStats = (userId: string | undefined, branchId: string | undefined, initialData?: any) => {
  return useQuery<CustomerStats>({
    queryKey: ['customer_stats', branchId],
    queryFn: async () => {
      if (!userId || !branchId) {
        return { totalCustomers: 0, birthdaysThisMonth: 0, newThisMonth: 0, categoryBreakdown: {} };
      }

      const result = await getCustomerStatsAction(userId, branchId);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch customer stats');
      }

      const d = result.data;
      return {
        totalCustomers: d.totalCustomers || 0,
        birthdaysThisMonth: d.birthdaysThisMonth || 0,
        newThisMonth: d.newThisMonth || 0,
        categoryBreakdown: d.categoryBreakdown || {}
      };
    },
    initialData: initialData ? {
        totalCustomers: initialData.totalCustomers || 0,
        birthdaysThisMonth: initialData.birthdaysThisMonth || 0,
        newThisMonth: initialData.newThisMonth || 0,
        categoryBreakdown: initialData.categoryBreakdown || {}
    } : undefined,
    enabled: !!userId && !!branchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};
