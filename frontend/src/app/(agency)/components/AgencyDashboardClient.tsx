"use client";

import dynamic from "next/dynamic";
import { useProfiles } from "@/contexts/ProfileContext";
import UpdateNotificationButton from "@/components/UpdateNotificationButton";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import QuickActionButtons from "@/components/dashboard/QuickActionButtons";
import AccessDenied404 from "@/components/AccessDenied404";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDashboardActions } from "@/hooks/useDashboardActions";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Sale, AnalyticsData } from "@/types";

// 🚀 FIXED: Use next/dynamic with ssr: false for components with auto-generated IDs (Radix)
const AnalyticsDashboard = dynamic(
  () => import("@/components/AnalyticsDashboard"),
  { 
    ssr: false,
    loading: () => <DashboardSkeleton />
  }
);

export default function AgencyDashboardClient({
  initialSales,
  initialAnalytics,
}: {
  initialSales?: Sale[];
  initialAnalytics?: AnalyticsData | null;
}) {
  const { isLoading: profilesLoading } = useProfiles();
  const {
    settings,
    sales,
    pageTitle,
    isLoading,
    settingsLoading,
    updateAvailable,
    isUpdating,
    triggerUpdate,
  } = useDashboardData(initialSales, initialAnalytics);

  const { isRefreshing, handleRefresh, handleQuickCreate } =
    useDashboardActions();

  // 🚀 PERFORMANCE OPTIMIZATION: 
  // If we have initial SSR data, we skip the secondary full-page 'LoadingSpinner' 
  // to avoid the "Triple Loading" effect (Skeleton -> Spinner -> Content).
  // We only show the spinner if we are truly missing data.
  const isDataReady = !!initialAnalytics || (sales && sales.length > 0);

  if (!isDataReady && (profilesLoading || isLoading || settingsLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  // If settings aren't fully configured, we show the 404 state with logout
  const hasSettings = settings.businessName && settings.businessPhone;
  
  if (!hasSettings && !settingsLoading) {
    return <AccessDenied404 />;
  }

  return (
    <>
      <DashboardHeader
        pageTitle={pageTitle}
        isRefreshing={isRefreshing}
        isLoading={isLoading}
        onRefresh={handleRefresh}
      />

      {updateAvailable && (
        <UpdateNotificationButton
          onUpdate={triggerUpdate}
          isUpdating={isUpdating}
        />
      )}

      <QuickActionButtons onQuickCreate={handleQuickCreate} />

      <AnalyticsDashboard 
        sales={sales} 
        currency={settings.currency} 
        initialAnalytics={initialAnalytics}
      />
    </>
  );
}
