import { useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useBusiness } from '@/contexts/BusinessContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { AnalyticsData } from '@/types';

export const useDashboardData = (initialSales?: any[], initialAnalytics?: AnalyticsData | null) => {
  const { user } = useAuth();
  const { isLoading: businessLoading, error: businessError, currentBusiness } = useBusiness();
  const { settings, isLoading: settingsLoading } = useBusinessSettings();
  
  // 🚀 PERFORMANCE OPTIMIZATION: Removed useSalesData(50 items) fetch.
  // The dashboard now relies strictly on the consolidated 'analytics/summary' 
  // which provides both the counts and the 20 recent sales records.
  const { updateAvailable, isUpdating, triggerUpdate } = useAppUpdate();

  // Memoize page title computation
  const pageTitle = useMemo(() => {
    if (!settings.businessName || settings.businessName === 'Your Business Name') {
      return 'Dashboard';
    }
    return settings.businessName;
  }, [settings.businessName]);

  // Optimize loading state calculation
  const isLoading = useMemo(() => {
    return settingsLoading || businessLoading;
  }, [settingsLoading, businessLoading]);

  return {
    user,
    businessError,
    currentBusiness,
    settings,
    sales: initialSales || [], // Use SSR initialSales if available, otherwise empty
    initialAnalytics,
    pageTitle,
    isLoading,
    settingsLoading,
    updateAvailable,
    isUpdating,
    triggerUpdate
  };
};