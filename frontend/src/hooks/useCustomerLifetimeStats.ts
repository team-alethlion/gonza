import { useQuery } from '@tanstack/react-query';
import { useBusiness } from '@/contexts/BusinessContext';
import { getCustomerLifetimeStatsAction } from '@/app/actions/customers';

export const useCustomerLifetimeStats = (customerName: string | undefined) => {
    const { currentBusiness } = useBusiness();

    return useQuery({
        queryKey: ['customerLifetimeStats', currentBusiness?.id, customerName],
        queryFn: async () => {
            if (!currentBusiness?.id || !customerName) return { total: 0, count: 0 };
            const result = await getCustomerLifetimeStatsAction(currentBusiness.id, customerName);
            if (result.success && result.data) {
                return result.data;
            }
            return { total: 0, count: 0 };
        },
        enabled: !!currentBusiness?.id && !!customerName,
        staleTime: 60 * 1000, // 1 minute
    });
};
