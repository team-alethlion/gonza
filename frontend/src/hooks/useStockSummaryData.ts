import { useAuth } from '@/components/auth/AuthProvider';
import { useBusiness } from '@/contexts/BusinessContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStockSummaryReportAction } from '@/app/actions/inventory';

export interface StockSummaryData {
  productId: string;
  productName: string;
  itemNumber: string;
  imageUrl?: string | null;
  costPrice: number;
  sellingPrice: number;
  category?: string;
  openingStock: number;
  itemsSold: number;
  stockIn: number;
  transferOut: number;
  returnIn: number;
  returnOut: number;
  adjustmentsIn: number;
  adjustmentsOut: number;
  closingStock: number;
  revaluation: number;
}

export const useStockSummaryData = (
  dateRange: { from: Date | undefined; to: Date | undefined }
) => {
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();
  const queryClient = useQueryClient();

  const fetchStockSummary = async (): Promise<StockSummaryData[]> => {
    if (!user?.id || !currentBusiness?.id || !dateRange?.from || !dateRange?.to) return [];

    try {
      const result = await getStockSummaryReportAction(
        currentBusiness.id,
        dateRange.from.toISOString(),
        dateRange.to.toISOString()
      );

      if (result.success && result.data) {
        return result.data as StockSummaryData[];
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('[StockSummary] Error fetching report:', error.message);
      throw error;
    }
  };

  const { data: stockSummaryData = [], isLoading, refetch } = useQuery({
    queryKey: ['stockSummary', currentBusiness?.id, dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: fetchStockSummary,
    enabled: !!user?.id && !!currentBusiness?.id && !!dateRange?.from && !!dateRange?.to,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    stockSummaryData,
    isLoading,
    loadStockSummaryData: refetch,
    clearCache: () => {
      queryClient.invalidateQueries({ queryKey: ['stockSummary'] });
    },
    clearAllLocationCaches: () => {
      queryClient.invalidateQueries({ queryKey: ['stockSummary'] });
    }
  };
};
